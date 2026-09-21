"use client";

import { ArrowLeft, Check, ChevronRight, Loader2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import VideoPlayer from "@/components/VideoPlayer";
import { getProgress, getTitleProgress, saveProgress, type Progress } from "@/lib/library";
import { getSource, type Episode, type Playback, type TitleDetails } from "@/lib/sources";

function isHls(url: string) {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".m3u8");
  } catch {
    return false;
  }
}

function WatchContent() {
  const router = useRouter();
  const params = useSearchParams();
  const sourceId = params.get("source");
  const itemId = params.get("id");
  const epParam = params.get("ep");
  const directUrl = params.get("url");
  const directTitle = params.get("title");

  const isDirect = sourceId === "direct";
  const source = getSource(sourceId);

  const [details, setDetails] = useState<TitleDetails | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [startAt, setStartAt] = useState(0);
  const [progressMap, setProgressMap] = useState<Record<string, Progress>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const effectiveItemId = isDirect ? directUrl ?? "" : itemId ?? "";
  const titleText = isDirect ? directTitle || (directUrl ? new URL(directUrl, "https://x").hostname : "Direct link") : details?.title ?? "";
  const cover = details?.cover ?? "";

  // Load title + episode list (catalog sources only).
  useEffect(() => {
    if (isDirect || !source || !itemId) return;
    let cancelled = false;
    Promise.all([source.details(itemId), source.episodes(itemId)])
      .then(([d, e]) => {
        if (cancelled) return;
        setDetails(d);
        setEpisodes(e);
        setProgressMap(getTitleProgress(source.id, itemId));
        if (!epParam && e[0]) router.replace(`/watch?source=${encodeURIComponent(source.id)}&id=${encodeURIComponent(itemId)}&ep=${encodeURIComponent(e[0].id)}`);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Failed to load title."));
    return () => {
      cancelled = true;
    };
  }, [isDirect, source, itemId, epParam, router]);

  // Resolve the stream for the current episode.
  useEffect(() => {
    let cancelled = false;
    setPlayback(null);
    setError(null);

    if (isDirect) {
      if (!directUrl || !/^https?:\/\//i.test(directUrl)) {
        setError("That link isn't a valid http(s) URL.");
        setLoading(false);
        return;
      }
      setStartAt(getProgress("direct", directUrl, "0")?.position ?? 0);
      setPlayback({ streams: [{ url: directUrl, kind: isHls(directUrl) ? "hls" : "file" }] });
      setLoading(false);
      return;
    }

    if (!source || !itemId || !epParam) return; // waiting for redirect / params
    setLoading(true);
    source
      .playback(itemId, epParam)
      .then((pb) => {
        if (cancelled) return;
        const saved = getProgress(source.id, itemId, epParam);
        setStartAt(saved && !saved.completed ? saved.position : 0);
        setPlayback(pb);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Couldn't load the stream."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isDirect, source, itemId, epParam, directUrl]);

  const currentIndex = episodes.findIndex((e) => e.id === epParam);
  const current = currentIndex >= 0 ? episodes[currentIndex] : undefined;
  const next = currentIndex >= 0 ? episodes[currentIndex + 1] : undefined;

  const goTo = useCallback(
    (episodeId: string) => {
      if (!source || !itemId) return;
      router.push(`/watch?source=${encodeURIComponent(source.id)}&id=${encodeURIComponent(itemId)}&ep=${encodeURIComponent(episodeId)}`);
    },
    [router, source, itemId],
  );

  const onProgress = useCallback(
    (position: number, duration: number) => {
      if (!effectiveItemId) return;
      if (isDirect) {
        saveProgress({
          sourceId: "direct",
          itemId: effectiveItemId,
          episodeId: "0",
          episodeNumber: 1,
          episodeTitle: titleText,
          itemTitle: titleText,
          cover: "/logo-mark.svg",
          position,
          duration,
        });
      } else if (source && current && details) {
        saveProgress({
          sourceId: source.id,
          itemId: effectiveItemId,
          episodeId: current.id,
          episodeNumber: current.number,
          episodeTitle: current.title,
          itemTitle: details.title,
          cover: details.cover,
          position,
          duration,
        });
      }
    },
    [isDirect, effectiveItemId, source, current, details, titleText],
  );

  const title = useMemo(() => (current && episodes.length > 1 ? `${titleText} — ${current.title}` : titleText), [current, episodes.length, titleText]);
  const backHref = isDirect ? "/browse" : `/title?source=${encodeURIComponent(sourceId ?? "")}&id=${encodeURIComponent(itemId ?? "")}`;

  return (
    <div className="min-h-screen bg-[#0a0908]">
      <header className="flex h-[56px] items-center gap-3 border-b border-white/10 px-3 sm:px-5">
        <Link href={backHref} className="grid h-9 w-9 shrink-0 place-items-center border border-white/10 text-[#a49992] transition hover:bg-white/5 hover:text-white" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{title || "Loading…"}</p>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-0 lg:grid-cols-[1fr_360px]">
        <div>
          {playback && !error ? (
            <VideoPlayer
              key={`${effectiveItemId}::${epParam ?? "0"}`}
              playback={playback}
              startAt={startAt}
              onProgress={onProgress}
              onEnded={() => next && goTo(next.id)}
            />
          ) : (
            <div className="grid aspect-video w-full place-items-center bg-black">
              {error ? (
                <div className="flex max-w-md items-start gap-3 p-6">
                  <TriangleAlert className="h-5 w-5 shrink-0 text-[#c45b36]" />
                  <p className="text-sm text-[#e9e2dc]">{error}</p>
                </div>
              ) : (
                loading && <Loader2 className="h-6 w-6 animate-spin text-white/60" />
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <p className="truncate text-lg font-medium tracking-tight">{titleText}</p>
              {current && episodes.length > 1 && <p className="mt-0.5 truncate text-xs text-[#897973]">Episode {current.number} · {current.title}</p>}
            </div>
            {next && (
              <button onClick={() => goTo(next.id)} className="inline-flex shrink-0 items-center gap-2 bg-[#f4f0ea] px-4 py-2.5 text-xs font-semibold text-[#0a0908] transition hover:bg-white">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {episodes.length > 1 && (
          <aside className="max-h-[calc(100vh-56px)] overflow-auto border-t border-white/10 custom-scrollbar lg:border-l lg:border-t-0">
            <p className="sticky top-0 border-b border-white/10 bg-[#0a0908] px-4 py-3 text-[10px] uppercase tracking-micro text-[#6f605a]">Episodes</p>
            {episodes.map((ep) => {
              const p = progressMap[ep.id];
              const active = ep.id === epParam;
              return (
                <button
                  key={ep.id}
                  onClick={() => goTo(ep.id)}
                  className={`flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left text-sm transition ${
                    active ? "bg-[#9d3715]/10 text-white" : "text-[#a49992] hover:bg-white/[0.03] hover:text-white"
                  }`}
                >
                  <span className="w-6 shrink-0 text-xs tabular-nums text-[#6f605a]">{ep.number}</span>
                  <span className="min-w-0 flex-1 truncate">{ep.title}</span>
                  {p?.completed && <Check className="h-4 w-4 shrink-0 text-[#c45b36]" />}
                </button>
              );
            })}
          </aside>
        )}
      </div>
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={null}>
      <WatchContent />
    </Suspense>
  );
}
