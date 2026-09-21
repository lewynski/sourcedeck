"use client";

import { Play } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Props = {
  href: string;
  title: string;
  cover: string;
  subtitle?: string;
  progress?: number; // 0..1
};

export default function PosterCard({ href, title, cover, subtitle, progress }: Props) {
  const [broken, setBroken] = useState(false);
  return (
    <Link href={href} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden border border-white/10 bg-[#11100f] transition group-hover:border-[#9d3715]/70">
        {!broken ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
            onError={() => setBroken(true)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center p-4 text-center text-xs text-[#6f605a]">{title}</div>
        )}
        <div className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
          <span className="grid h-11 w-11 place-items-center bg-[#f4f0ea] text-[#0a0908]">
            <Play className="h-4 w-4 fill-current" />
          </span>
        </div>
        {progress !== undefined && progress > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
            <div className="h-full bg-[#c45b36]" style={{ width: `${Math.min(100, progress * 100)}%` }} />
          </div>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-[#e9e2dc]">{title}</p>
      {subtitle && <p className="mt-0.5 truncate text-[11px] text-[#6f605a]">{subtitle}</p>}
    </Link>
  );
}
