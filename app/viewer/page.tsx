"use client";

import {
  ArrowLeft,
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

  useEffect(() => {
    setFrameStarted(false);
    setShowEmbedHelp(false);
    if (!url) return;

    const timer = window.setTimeout(() => {
      if (!frameStarted) setShowEmbedHelp(true);
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [url, frameKey, frameStarted]);

  function openExternal() {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
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
            onClick={openExternal}
            className="flex h-10 shrink-0 items-center gap-2 bg-[#f4f0ea] px-3 text-xs font-semibold text-[#0a0908] transition hover:bg-white sm:px-4"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="hidden sm:inline">Open externally</span>
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 bg-[#050505]">
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

        {!frameStarted && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#0a0908]">
            <div className="flex items-center gap-3 text-sm text-[#897973]">
              <Loader2 className="h-4 w-4 animate-spin" /> Opening {hostname(url)}…
            </div>
          </div>
        )}

        {showEmbedHelp && (
          <div className="absolute bottom-4 left-1/2 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 border border-[#9d3715]/50 bg-[#11100f]/95 p-4 shadow-2xl backdrop-blur-xl sm:flex sm:items-center sm:justify-between sm:gap-5">
            <div>
              <p className="text-sm font-medium text-[#e9e2dc]">Source taking too long?</p>
              <p className="mt-1 text-xs leading-5 text-[#897973]">
                Some websites block iframe embedding with browser security headers. SourceDeck does not bypass those protections.
              </p>
            </div>
            <button
              onClick={openExternal}
              className="mt-3 inline-flex shrink-0 items-center gap-2 bg-[#f4f0ea] px-4 py-2.5 text-xs font-semibold text-[#0a0908] sm:mt-0"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open website
            </button>
          </div>
        )}
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-white/10 bg-[#0a0908] px-4 py-2 text-[10px] text-[#6f605a] sm:px-5">
        <span className="truncate">Embedded web mode • site permissions still apply</span>
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
