"use client";

import { ArrowLeft, Check, Heart, Loader2, Play, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import AppNav from "@/components/AppNav";
import { getTitleProgress, isInLibrary, toggleLibrary, type Progress } from "@/lib/library";
import { getSource, type Episode, type TitleDetails } from "@/lib/sources";

function formatTime(seconds: number) {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  return h ? `${h}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` : `${m}:${String(s % 60).padStart(2, "0")}`;
}

function TitleContent() {
  const params = useSearchParams();
  const sourceId = params.get("source");
  const itemId = params.get("id");
  const source = getSource(sourceId);

  const [details, setDetails] = useState<TitleDetails | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [inLibrary, setInLibrary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!source || !itemId) {
      setError("This title could not be found.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([source.details(itemId), source.episodes(itemId)])
      .then(([d, e]) => {
        if (cancelled) return;
        setDetails(d);
        setEpisodes(e);
        setProgress(getTitleProgress(source.id, itemId));
        setInLibrary(isInLibrary(source.id, itemId));
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Failed to load title."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [source, itemId]);

  const watchHref = (episodeId: string) =>
    `/watch?source=${encodeURIComponent(source!.id)}&id=${encodeURIComponent(itemId!)}&ep=${encodeURIComponent(episodeId)}`;

  // Resume the most recently watched episode, otherwise start at episode 1.
  const latestProgress = Object.values(progress).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const startEpisode = latestProgress && !latestProgress.completed ? latestProgress.episodeId : episodes[0]?.id;

  return (
    <div className="min-h-screen">
      <AppNav active="browse" />
      <main className="mx-auto max-w-[1100px] px-4 py-7 sm:px-7">
        <Link href="/browse" className="inline-flex items-center gap-2 text-xs text-[#897973] hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to browse
        </Link>

        {loading && (
          <div className="mt-20 flex items-center justify-center gap-3 text-sm text-[#897973]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {error && (
          <div className="mt-8 flex items-start gap-3 border border-[#9d3715]/50 bg-[#11100f] p-5">
            <TriangleAlert className="h-5 w-5 shrink-0 text-[#c45b36]" />
            <p className="text-sm text-[#e9e2dc]">{error}</p>
          </div>
        )}

        {details && source && (
          <div className="mt-6 animate-fade-up">
            <div className="grid gap-8 md:grid-cols-[220px_1fr]">
              <img src={details.cover} alt="" className="aspect-[2/3] w-full max-w-[220px] border border-white/10 bg-[#11100f] object-cover" />
              <div>
                <p className="text-[10px] uppercase tracking-micro text-[#6f605a]">{source.name}</p>
                <h1 className="mt-2 text-3xl font-medium leading-tight tracking-[-0.03em] sm:text-4xl">{details.title}</h1>
                <p className="mt-2 text-xs text-[#897973]">{[details.year, details.creator].filter(Boolean).join(" · ")}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {startEpisode && (
                    <Link href={watchHref(startEpisode)} className="inline-flex items-center gap-2 bg-[#f4f0ea] px-5 py-3 text-xs font-semibold text-[#0a0908] transition hover:bg-white">
                      <Play className="h-4 w-4 fill-current" /> {latestProgress && !latestProgress.completed ? `Resume episode ${latestProgress.episodeNumber}` : "Start watching"}
                    </Link>
                  )}
                  <button
                    onClick={() =>
                      setInLibrary(toggleLibrary({ sourceId: source.id, itemId: details.id, title: details.title, cover: details.cover }))
                    }
                    className={`inline-flex items-center gap-2 border px-4 py-3 text-xs transition ${
                      inLibrary ? "border-[#9d3715]/70 bg-[#9d3715]/10 text-white" : "border-white/15 text-[#d7cec8] hover:bg-white/5"
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${inLibrary ? "fill-[#c45b36] text-[#c45b36]" : ""}`} />
                    {inLibrary ? "In library" : "Add to library"}
                  </button>
                </div>
                {details.genres.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {details.genres.map((g) => (
                      <span key={g} className="border border-white/10 px-2 py-0.5 text-[11px] text-[#897973]">{g}</span>
                    ))}
                  </div>
                )}
                <p className="mt-5 max-h-56 overflow-auto whitespace-pre-line text-sm leading-6 text-[#a49992] custom-scrollbar">{details.description}</p>
              </div>
            </div>

            <section className="mt-10">
              <p className="mb-3 text-[10px] uppercase tracking-micro text-[#6f605a]">
                {episodes.length} {episodes.length === 1 ? "video" : "episodes"}
              </p>
              {episodes.length === 0 ? (
                <p className="border border-white/10 bg-[#11100f] p-5 text-sm text-[#897973]">This title has no playable video files.</p>
              ) : (
                <div className="divide-y divide-white/10 border border-white/10">
                  {episodes.map((ep) => {
                    const p = progress[ep.id];
                    const ratio = p?.duration ? p.position / p.duration : 0;
                    return (
                      <Link key={ep.id} href={watchHref(ep.id)} className="group relative flex items-center gap-4 bg-[#0d0c0b] px-4 py-3 transition hover:bg-[#151311]">
                        <span className="w-8 shrink-0 text-xs tabular-nums text-[#6f605a]">{ep.number}</span>
                        <span className={`min-w-0 flex-1 truncate text-sm ${p?.completed ? "text-[#6f605a]" : "text-[#e9e2dc]"}`}>{ep.title}</span>
                        {p?.completed ? (
                          <Check className="h-4 w-4 text-[#c45b36]" />
                        ) : p ? (
                          <span className="text-[11px] tabular-nums text-[#897973]">{formatTime(p.position)}</span>
                        ) : (
                          <Play className="h-4 w-4 text-[#6f605a] transition group-hover:text-white" />
                        )}
                        {ratio > 0 && !p?.completed && (
                          <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white/5">
                            <span className="block h-full bg-[#c45b36]" style={{ width: `${ratio * 100}%` }} />
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TitlePage() {
  return (
    <Suspense fallback={null}>
      <TitleContent />
    </Suspense>
  );
}
