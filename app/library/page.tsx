"use client";

import { Compass } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import AppNav from "@/components/AppNav";
import PosterCard from "@/components/PosterCard";
import { getContinueWatching, getLibrary, resumeHref, type LibraryEntry, type Progress } from "@/lib/library";

export default function LibraryPage() {
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [resume, setResume] = useState<Progress[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLibrary(getLibrary());
    setResume(getContinueWatching(24));
    setReady(true);
  }, []);

  return (
    <div className="min-h-screen">
      <AppNav active="library" />
      <main className="mx-auto max-w-[1480px] px-4 py-7 sm:px-7 lg:px-10">
        {resume.length > 0 && (
          <section className="mb-12">
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

        <p className="mb-4 text-[10px] uppercase tracking-micro text-[#6f605a]">Saved titles · {library.length}</p>
        {ready && library.length === 0 ? (
          <div className="border border-white/10 bg-[#11100f] p-10 text-center">
            <p className="text-sm text-[#a49992]">Your library is empty. Add titles from any source to keep them here.</p>
            <Link href="/browse" className="mt-5 inline-flex items-center gap-2 bg-[#f4f0ea] px-5 py-2.5 text-xs font-semibold text-[#0a0908]">
              <Compass className="h-4 w-4" /> Browse sources
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
            {library.map((entry) => (
              <PosterCard
                key={`${entry.sourceId}${entry.itemId}`}
                href={`/title?source=${encodeURIComponent(entry.sourceId)}&id=${encodeURIComponent(entry.itemId)}`}
                title={entry.title}
                cover={entry.cover}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
