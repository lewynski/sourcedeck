"use client";

import { Compass, Library, Link2 } from "lucide-react";
import Link from "next/link";

const links = [
  { id: "browse", href: "/browse", label: "Browse", icon: Compass },
  { id: "library", href: "/library", label: "Library", icon: Library },
  { id: "sources", href: "/", label: "Web sources", icon: Link2 },
] as const;

export default function AppNav({ active }: { active?: "browse" | "library" | "sources" }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0908]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[64px] max-w-[1480px] items-center justify-between gap-4 px-4 sm:px-7 lg:px-10">
        <Link href="/browse" className="flex items-center gap-3">
          <img src="/logo-mark.svg" alt="" className="h-8 w-8" />
          <span className="text-sm font-semibold tracking-tight">SOURCEDECK</span>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map(({ id, href, label, icon: Icon }) => (
            <Link
              key={id}
              href={href}
              className={`flex items-center gap-2 border px-3 py-2 text-xs transition ${
                active === id
                  ? "border-[#9d3715]/70 bg-[#9d3715]/10 text-[#f4f0ea]"
                  : "border-transparent text-[#a49992] hover:border-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
