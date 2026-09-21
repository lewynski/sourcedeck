import { NextRequest, NextResponse } from "next/server";
import { assertPublicUrl } from "@/lib/ssrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Result = {
  embeddable: boolean | "unknown";
  reason: string;
  finalUrl?: string;
};

function frameAncestors(csp: string | null): string[] | null {
  if (!csp) return null;
  for (const part of csp.split(",")) {
    for (const directive of part.split(";")) {
      const [name, ...values] = directive.trim().split(/\s+/);
      if (name?.toLowerCase() === "frame-ancestors") return values.map((v) => v.toLowerCase());
    }
  }
  return null;
}

async function fetchWithRedirects(start: string, signal: AbortSignal) {
  let current = start;
  for (let i = 0; i < 5; i++) {
    const url = await assertPublicUrl(current);
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal,
      headers: { "user-agent": "Mozilla/5.0 (SourceDeck embed check)", accept: "text/html,*/*" },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location")!, url).toString();
      res.body?.cancel();
      continue;
    }
    res.body?.cancel(); // we only need headers
    return { res, finalUrl: url.toString() };
  }
  throw new Error("Too many redirects");
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  if (!target) return NextResponse.json({ embeddable: "unknown", reason: "Missing url" } satisfies Result, { status: 400 });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const { res, finalUrl } = await fetchWithRedirects(target, controller.signal);
    const xfo = res.headers.get("x-frame-options")?.toLowerCase().trim() ?? "";
    const ancestors = frameAncestors(res.headers.get("content-security-policy"));
    const myOrigin = req.nextUrl.origin.toLowerCase();

    let result: Result;
    if (xfo.includes("deny") || xfo.includes("sameorigin")) {
      result = { embeddable: false, reason: `The site sends X-Frame-Options: ${xfo.toUpperCase()}`, finalUrl };
    } else if (ancestors && !(ancestors.includes("*") || ancestors.includes(myOrigin))) {
      result = { embeddable: false, reason: "The site's Content-Security-Policy restricts which sites may embed it (frame-ancestors)", finalUrl };
    } else {
      result = { embeddable: true, reason: "No embedding restrictions were found in the response headers", finalUrl };
    }
    return NextResponse.json(result, { headers: { "cache-control": "private, max-age=300" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Check failed";
    return NextResponse.json({ embeddable: "unknown", reason: message } satisfies Result);
  } finally {
    clearTimeout(timer);
  }
}
