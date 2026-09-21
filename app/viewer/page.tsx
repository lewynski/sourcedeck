"use client";

import {
  AppWindow,
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Globe2,
  Home,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { loadSources } from "@/lib/storage";
import type { SavedSource } from "@/types/source";

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function safeUrl(value: string | null) {
  if (!value) return null;
  try {
    const parsed = new URL(normalizeUrl(value));
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

type EmbedCheck = { status: "checking" | "ok" | "blocked" | "unknown"; reason?: string };

function ViewerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceId = searchParams.get("id");
  const rawUrl = searchParams.get("url");
  const rawName = searchParams.get("name");

  const [source, setSource] = useState<SavedSource | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const [frameStarted, setFrameStarted] = useState(false);
  const [showEmbedHelp, setShowEmbedHelp] = useState(false);
  const [embedCheck, setEmbedCheck] = useState<EmbedCheck>({ status: "checking" });
  const [forceEmbed, setForceEmbed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sourceId) {
      setLoaded(true);
      return;
    }
    const match = loadSources().find((item) => item.id === sourceId) ?? null;
    setSource(match);
    setLoaded(true);
  }, [sourceId]);

  const url = useMemo(() => safeUrl(source?.url ?? rawUrl), [source?.url, rawUrl]);
  const name = source?.name ?? rawName ?? (url ? hostname(url) : "Web source");

  // Ask the server whether the site permits being framed, so we can tell the
  // user immediately instead of showing a blank iframe for several seconds.
  useEffect(() => {
    setForceEmbed(false);
    if (!url) return;
    const controller = new AbortController();
    setEmbedCheck({ status: "checking" });
    fetch(`/api/embed-check?url=${encodeURIComponent(url)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.embeddable === true) setEmbedCheck({ status: "ok", reason: data.reason });
        else if (data.embeddable === false) setEmbedCheck({ status: "blocked", reason: data.reason });
        else setEmbedCheck({ status: "unknown", reason: data.reason });
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setEmbedCheck({ status: "unknown" });
      });
    return () => controller.abort();
  }, [url]);

  const showFrame = !!url && (embedCheck.status === "ok" || embedCheck.status === "unknown" || forceEmbed);

  // Reset load state only when the target or reload key changes.
  useEffect(() => {
    setFrameStarted(false);
    setShowEmbedHelp(false);
  }, [url, frameKey, forceEmbed]);

  // Slow-load hint (separate effect so a successful load doesn't reset itself).
  useEffect(() => {
    if (!showFrame || frameStarted) return;
    const timer = window.setTimeout(() => setShowEmbedHelp(true), 6000);
    return () => window.clearTimeout(timer);
  }, [showFrame, frameStarted, frameKey]);

  function openExternal() {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // A separate top-level browser window: the site runs as itself, so its own
  // player, login and DRM work normally, while SourceDeck stays open beside it.
  function openPlayerWindow() {
    if (!url) return;
    const w = Math.min(1280, window.screen.availWidth);
    const h = Math.min(800, window.screen.availHeight);
    const left = Math.max(0, (window.screen.availWidth - w) / 2);
    const top = Math.max(0, (window.screen.availHeight - h) / 2);
    const win = window.open(url, "sourcedeck-player", `popup=yes,width=${w},height=${h},left=${left},top=${top}`);
    if (!win) openExternal(); // popup blocked → fall back to a normal tab
  }

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }

  if (!loaded) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0a0908] text-[#f4f0ea]">
        <div className="flex items-center gap-3 text-sm text-[#a49992]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading source…
        </div>
      </main>
    );
  }

  if (!url) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0a0908] px-5 text-[#f4f0ea]">
        <div className="w-full max-w-lg border border-white/10 bg-[#11100f] p-8 text-center">
          <ShieldAlert className="mx-auto h-7 w-7 text-[#c45b36]" />
          <h1 className="mt-5 text-2xl font-medium tracking-[-0.03em]">Source unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-[#897973]">
            This source could not be found or its URL is invalid. It may have been removed from your local library.
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 inline-flex items-center gap-2 bg-[#f4f0ea] px-5 py-2.5 text-sm font-semibold text-[#0a0908]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to SourceDeck
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#0a0908] text-[#f4f0ea]">
      <header className="shrink-0 border-b border-white/10 bg-[#0a0908]/95 backdrop-blur-xl">
        <div className="flex h-[64px] items-center gap-2 px-3 sm:px-5">
          <button
            onClick={() => router.push("/")}
            className="grid h-10 w-10 shrink-0 place-items-center border border-white/10 text-[#a49992] transition hover:bg-white/5 hover:text-white"
            aria-label="Back to SourceDeck"
            title="Back to SourceDeck"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="hidden min-w-0 items-center gap-3 border-r border-white/10 pr-4 sm:flex">
            <img src="/logo-mark.svg" alt="" className="h-9 w-9" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate text-[10px] uppercase tracking-micro text-[#6f605a]">Built-in source viewer</p>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-center border border-white/10 bg-[#11100f] px-3">
            <Globe2 className="mr-2 h-4 w-4 shrink-0 text-[#6f605a]" />
            <span className="min-w-0 flex-1 truncate py-2.5 text-xs text-[#897973] sm:text-sm">{url}</span>
          </div>

          <button
            onClick={() => setFrameKey((key) => key + 1)}
            className="grid h-10 w-10 shrink-0 place-items-center border border-white/10 text-[#a49992] transition hover:bg-white/5 hover:text-white"
            aria-label="Reload source"
            title="Reload source"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setFrameKey((key) => key + 1)}
            className="hidden h-10 items-center gap-2 border border-white/10 px-3 text-xs text-[#a49992] transition hover:bg-white/5 hover:text-white md:flex"
            aria-label="Go to source home"
            title="Go to source home"
          >
            <Home className="h-4 w-4" /> Source home
          </button>
          <button
            onClick={openPlayerWindow}
            className="hidden h-10 shrink-0 items-center gap-2 border border-white/10 px-3 text-xs text-[#a49992] transition hover:bg-white/5 hover:text-white md:flex"
            title="Open in a separate player window"
          >
            <AppWindow className="h-4 w-4" /> Player window
          </button>
          <button
            onClick={openExternal}
            className="flex h-10 shrink-0 items-center gap-2 bg-[#f4f0ea] px-3 text-xs font-semibold text-[#0a0908] transition hover:bg-white sm:px-4"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="hidden sm:inline">Open externally</span>
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 bg-[#050505]">
        {showFrame && (
        <iframe
          key={frameKey}
          src={url}
          title={`${name} source viewer`}
          className="h-full w-full border-0 bg-white"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-downloads"
          onLoad={() => {
            setFrameStarted(true);
            setShowEmbedHelp(false);
          }}
        />
        )}

        {embedCheck.status === "checking" && !forceEmbed && (
          <div className="absolute inset-0 grid place-items-center bg-[#0a0908]">
            <div className="flex items-center gap-3 text-sm text-[#897973]">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking {hostname(url)}…
            </div>
          </div>
        )}

        {embedCheck.status === "blocked" && !forceEmbed && (
          <div className="absolute inset-0 grid place-items-center overflow-auto bg-[#0a0908] px-5">
            <div className="w-full max-w-xl border border-white/10 bg-[#11100f] p-7">
              <ShieldAlert className="h-6 w-6 text-[#c45b36]" />
              <h2 className="mt-4 text-xl font-medium tracking-[-0.03em]">{hostname(url)} can&apos;t be embedded</h2>
              <p className="mt-2 text-sm leading-6 text-[#897973]">
                {embedCheck.reason}. This is a deliberate protection set by the site, and streaming services also tend to
                require a top-level page for their DRM-protected player and login. SourceDeck doesn&apos;t bypass it — open the
                site in its own window instead.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  onClick={openPlayerWindow}
                  className="inline-flex items-center gap-2 bg-[#f4f0ea] px-4 py-2.5 text-xs font-semibold text-[#0a0908] transition hover:bg-white"
                >
                  <AppWindow className="h-4 w-4" /> Open in player window
                </button>
                <button
                  onClick={openExternal}
                  className="inline-flex items-center gap-2 border border-white/10 px-4 py-2.5 text-xs text-[#a49992] transition hover:bg-white/5 hover:text-white"
                >
                  <ExternalLink className="h-4 w-4" /> New tab
                </button>
                <button
                  onClick={copyLink}
                  className="inline-flex items-center gap-2 border border-white/10 px-4 py-2.5 text-xs text-[#a49992] transition hover:bg-white/5 hover:text-white"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy link"}
                </button>
              </div>
              <button
                onClick={() => setForceEmbed(true)}
                className="mt-5 text-[11px] text-[#6f605a] underline underline-offset-4 hover:text-[#a49992]"
              >
                Try embedding anyway
              </button>
            </div>
          </div>
        )}

        {showFrame && !frameStarted && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#0a0908]">
            <div className="flex items-center gap-3 text-sm text-[#897973]">
              <Loader2 className="h-4 w-4 animate-spin" /> Opening {hostname(url)}…
            </div>
          </div>
        )}

        {showFrame && showEmbedHelp && !frameStarted && (
          <div className="absolute bottom-4 left-1/2 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 border border-[#9d3715]/50 bg-[#11100f]/95 p-4 shadow-2xl backdrop-blur-xl sm:flex sm:items-center sm:justify-between sm:gap-5">
            <div>
              <p className="text-sm font-medium text-[#e9e2dc]">Source taking too long?</p>
              <p className="mt-1 text-xs leading-5 text-[#897973]">
                Some websites block iframe embedding with browser security headers. SourceDeck does not bypass those protections.
              </p>
            </div>
            <button
              onClick={openPlayerWindow}
              className="mt-3 inline-flex shrink-0 items-center gap-2 bg-[#f4f0ea] px-4 py-2.5 text-xs font-semibold text-[#0a0908] sm:mt-0"
            >
              <AppWindow className="h-3.5 w-3.5" /> Open player window
            </button>
          </div>
        )}
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-white/10 bg-[#0a0908] px-4 py-2 text-[10px] text-[#6f605a] sm:px-5">
        <span className="truncate">Embedded web mode • sites that forbid framing open in a player window</span>
        <span className="hidden shrink-0 sm:inline">Android version can later use a native WebView for fuller navigation controls.</span>
      </footer>
    </main>
  );
}


function ViewerFallback() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#0a0908] text-[#f4f0ea]">
      <div className="flex items-center gap-3 text-sm text-[#a49992]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading viewer…
      </div>
    </main>
  );
}

export default function ViewerPage() {
  return (
    <Suspense fallback={<ViewerFallback />}>
      <ViewerContent />
    </Suspense>
  );
}
