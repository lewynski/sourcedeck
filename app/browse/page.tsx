"use client";

import { Loader2, PlayCircle, Search, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import AppNav from "@/components/AppNav";
import PosterCard from "@/components/PosterCard";
import { getContinueWatching, resumeHref, type Progress } from "@/lib/library";
import { catalogSources, getSource, type CatalogItem } from "@/lib/sources";

type Mode = "popular" | "latest" | "search";

const HLS_DEMO = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

export default function BrowsePage() {
  const [sourceId, setSourceId] = useState(catalogSources[0]?.id ?? "");
  const source = getSource(sourceId);

  const [category, setCategory] = useState<string>("all");
  const [mode, setMode] = useState<Mode>("popular");
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resume, setResume] = useState<Progress[]>([]);
  const [directUrl, setDirectUrl] = useState("");
  const requestId = useRef(0);

  useEffect(() => setResume(getContinueWatching()), []);

  const load = useCallback(
    async (nextPage: number, replace: boolean) => {
      if (!source) return;
      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      try {
        const result =
          mode === "search" && submitted
            ? await source.search(submitted, nextPage, category)
            : mode === "latest"
              ? await source.latest(nextPage, category)
              : await source.popular(nextPage, category);
        if (id !== requestId.current) return; // a newer request superseded this one
        setItems((prev) => (replace ? result.items : [...prev, ...result.items]));
        setHasNext(result.hasNext);
        setPage(nextPage);
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err instanceof Error ? err.message : "Could not load this source.");
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [source, mode, submitted, category],
  );

  useEffect(() => {
    load(1, true);
  }, [load]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    setSubmitted(q);
    setMode(q ? "search" : "popular");
  }

  function playDirect(e: FormEvent) {
    e.preventDefault();
    const value = directUrl.trim();
    if (!/^https?:\/\//i.test(value)) return;
    window.location.href = `/watch?source=direct&url=${encodeURIComponent(value)}`;
  }

  return (
    <div className="min-h-screen">
      <AppNav active="browse" />
      <main className="mx-auto max-w-[1480px] px-4 py-7 sm:px-7 lg:px-10">
        {resume.length > 0 && (
          <section className="mb-10">
            <p className="mb-4 text-[10px] uppercase tracking-micro text-[#6f605a]">Continue watching</p>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
              {resume.map((p) => (
                <PosterCard
                  key={`${p.sourceId}${p.itemId}`}
                  href={resumeHref(p)}
                  title={p.itemTitle}
                  cover={p.cover}
                  subtitle={`Ep ${p.episodeNumber}`}
                  progress={p.duration ? p.position / p.duration : 0}
                />
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-micro text-[#6f605a]">Source</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {catalogSources.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSourceId(s.id);
                    setCategory("all");
                    setMode("popular");
                    setSubmitted("");
                    setQuery("");
                  }}
                  className={`border px-3 py-2 text-xs transition ${
                    s.id === sourceId
                      ? "border-[#9d3715]/70 bg-[#9d3715]/10 text-white"
                      : "border-white/10 text-[#a49992] hover:text-white"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
            {source && <p className="mt-2 max-w-xl text-xs text-[#6f605a]">{source.description}</p>}
          </div>

          <form onSubmit={onSearch} className="flex w-full max-w-md items-center border border-white/15 bg-[#0a0908] p-1.5">
            <Search className="ml-2 h-4 w-4 shrink-0 text-[#897973]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${source?.name ?? "source"}`}
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[#6f605a]"
            />
            <button className="bg-[#f4f0ea] px-4 py-2 text-xs font-semibold text-[#0a0908]">Search</button>
          </form>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-white/10 py-3">
          <div className="flex gap-1">
            {(["popular", "latest"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setSubmitted("");
                  setQuery("");
                  setMode(m);
                }}
                className={`px-3 py-1.5 text-xs capitalize transition ${
                  mode === m ? "bg-[#f4f0ea] font-semibold text-[#0a0908]" : "text-[#a49992] hover:text-white"
                }`}
              >
                {m}
              </button>
            ))}
            {mode === "search" && <span className="px-3 py-1.5 text-xs text-[#c45b36]">Results for “{submitted}”</span>}
          </div>
          {source?.categories && (
            <div className="flex flex-wrap gap-1">
              {source.categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`border px-2.5 py-1 text-[11px] transition ${
                    category === c.id ? "border-[#9d3715]/70 text-white" : "border-white/10 text-[#897973] hover:text-white"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-8 flex items-start gap-3 border border-[#9d3715]/50 bg-[#11100f] p-5">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#c45b36]" />
            <div>
              <p className="text-sm text-[#e9e2dc]">{error}</p>
              <button onClick={() => load(1, true)} className="mt-3 text-xs underline underline-offset-4 text-[#a49992] hover:text-white">
                Try again
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
          {items.map((item) => (
            <PosterCard
              key={item.id}
              href={`/title?source=${encodeURIComponent(sourceId)}&id=${encodeURIComponent(item.id)}`}
              title={item.title}
              cover={item.cover}
              subtitle={item.subtitle}
            />
          ))}
        </div>

        {!loading && !error && items.length === 0 && (
          <p className="mt-16 text-center text-sm text-[#6f605a]">Nothing found.</p>
        )}

        <div className="mt-10 flex justify-center">
          {loading ? (
            <span className="flex items-center gap-3 text-sm text-[#897973]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </span>
          ) : (
            hasNext && (
              <button onClick={() => load(page + 1, false)} className="border border-white/15 px-6 py-3 text-xs text-[#d7cec8] transition hover:bg-white/5">
                Load more
              </button>
            )
          )}
        </div>

        <section className="mt-16 border border-white/10 bg-[#11100f] p-6">
          <p className="text-[10px] uppercase tracking-micro text-[#6f605a]">Direct link player</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#897973]">
            Paste a link to a video file (.mp4, .webm) or an HLS stream (.m3u8) that you&apos;re allowed to watch. It plays in SourceDeck&apos;s own player with resume support.
          </p>
          <form onSubmit={playDirect} className="mt-4 flex max-w-2xl flex-col gap-2 sm:flex-row">
            <input
              value={directUrl}
              onChange={(e) => setDirectUrl(e.target.value)}
              placeholder="https://example.com/video.m3u8"
              className="min-w-0 flex-1 border border-white/15 bg-[#0a0908] px-3 py-2.5 text-sm outline-none placeholder:text-[#6f605a]"
            />
            <button className="inline-flex items-center justify-center gap-2 bg-[#f4f0ea] px-5 py-2.5 text-xs font-semibold text-[#0a0908]">
              <PlayCircle className="h-4 w-4" /> Play
            </button>
          </form>
          <Link
            href={`/watch?source=direct&url=${encodeURIComponent(HLS_DEMO)}&title=${encodeURIComponent("HLS demo stream")}`}
            className="mt-3 inline-block text-xs text-[#897973] underline underline-offset-4 hover:text-white"
          >
            Try the HLS demo stream
          </Link>
        </section>
      </main>
    </div>
  );
}
