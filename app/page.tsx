"use client";

import {
  ArrowRight,
  Clock3,
  ExternalLink,
  FileDown,
  FileUp,
  FolderOpen,
  Globe2,
  Heart,
  History,
  Home,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadHistory, loadSources, saveHistory, saveSources } from "@/lib/storage";
import type { HistoryEntry, SavedSource, SourceCategory } from "@/types/source";

type ViewMode = "home" | "sources" | "favorites" | "history";

type SourceForm = {
  name: string;
  url: string;
  description: string;
  category: SourceCategory;
};

const emptyForm: SourceForm = {
  name: "",
  url: "",
  description: "",
  category: "Anime",
};

const categories: SourceCategory[] = ["Anime", "Manga", "Streaming", "Media", "Community", "Other"];

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function safeUrl(value: string) {
  try {
    const normalized = normalizeUrl(value);
    const parsed = new URL(normalized);
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

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "S";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatRelative(iso?: string) {
  if (!iso) return "Never opened";
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function HomePage() {
  const router = useRouter();
  const [sources, setSources] = useState<SavedSource[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [view, setView] = useState<ViewMode>("home");
  const [search, setSearch] = useState("");
  const [quickUrl, setQuickUrl] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SourceForm>(emptyForm);
  const [error, setError] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSources(loadSources());
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    saveSources(sources);
  }, [sources]);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const favoriteCount = useMemo(() => sources.filter((s) => s.favorite).length, [sources]);
  const opens = useMemo(() => sources.reduce((sum, source) => sum + source.openCount, 0), [sources]);

  const visibleSources = useMemo(() => {
    const needle = search.trim().toLowerCase();
    let list = view === "favorites" ? sources.filter((s) => s.favorite) : sources;
    if (!needle) return list;
    return list.filter((source) =>
      [source.name, source.url, source.description, source.category]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [sources, search, view]);

  const recentSources = useMemo(
    () =>
      [...sources]
        .filter((source) => source.lastOpenedAt)
        .sort((a, b) => new Date(b.lastOpenedAt ?? 0).getTime() - new Date(a.lastOpenedAt ?? 0).getTime())
        .slice(0, 4),
    [sources],
  );

  function pushHistory(name: string, url: string, sourceId?: string) {
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      sourceId,
      name,
      url,
      openedAt: new Date().toISOString(),
    };
    setHistory((current) => [entry, ...current].slice(0, 100));
  }

  function recordOpen(url: string, name: string, sourceId?: string) {
    pushHistory(name, url, sourceId);
    if (sourceId) {
      setSources((current) =>
        current.map((source) =>
          source.id === sourceId
            ? { ...source, lastOpenedAt: new Date().toISOString(), openCount: source.openCount + 1 }
            : source,
        ),
      );
    }
  }

  function openInViewer(url: string, name: string, sourceId?: string) {
    const parsed = safeUrl(url);
    if (!parsed) return;
    recordOpen(parsed, name, sourceId);

    if (sourceId) {
      router.push(`/viewer?id=${encodeURIComponent(sourceId)}`);
      return;
    }

    router.push(`/viewer?url=${encodeURIComponent(parsed)}&name=${encodeURIComponent(name)}`);
  }

  function handleQuickOpen(event: FormEvent) {
    event.preventDefault();
    const parsed = safeUrl(quickUrl);
    if (!parsed) {
      setError("Enter a valid http:// or https:// website address.");
      return;
    }
    setError("");
    openInViewer(parsed, hostname(parsed));
    setQuickUrl("");
  }

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  }

  function openEditModal(source: SavedSource) {
    setEditingId(source.id);
    setForm({
      name: source.name,
      url: source.url,
      description: source.description,
      category: source.category,
    });
    setError("");
    setModalOpen(true);
  }

  function submitSource(event: FormEvent) {
    event.preventDefault();
    const parsed = safeUrl(form.url);
    if (!form.name.trim()) {
      setError("Give this source a name.");
      return;
    }
    if (!parsed) {
      setError("Enter a valid http:// or https:// website address.");
      return;
    }

    if (editingId) {
      setSources((current) =>
        current.map((source) =>
          source.id === editingId
            ? {
                ...source,
                name: form.name.trim(),
                url: parsed,
                description: form.description.trim(),
                category: form.category,
              }
            : source,
        ),
      );
    } else {
      const next: SavedSource = {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        url: parsed,
        description: form.description.trim(),
        category: form.category,
        favorite: false,
        createdAt: new Date().toISOString(),
        openCount: 0,
      };
      setSources((current) => [next, ...current]);
    }

    setModalOpen(false);
    setForm(emptyForm);
    setEditingId(null);
    setError("");
  }

  function removeSource(id: string) {
    if (!window.confirm("Delete this saved source?")) return;
    setSources((current) => current.filter((source) => source.id !== id));
  }

  function toggleFavorite(id: string) {
    setSources((current) =>
      current.map((source) => (source.id === id ? { ...source, favorite: !source.favorite } : source)),
    );
  }

  function exportData() {
    const payload = JSON.stringify({ version: 1, sources, history }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sourcedeck-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed.sources)) throw new Error("Invalid backup");
        setSources(parsed.sources);
        setHistory(Array.isArray(parsed.history) ? parsed.history : []);
      } catch {
        window.alert("That file is not a valid SourceDeck backup.");
      } finally {
        if (importRef.current) importRef.current.value = "";
      }
    };
    reader.readAsText(file);
  }

  const navItems: Array<{ id: ViewMode; label: string; icon: typeof Home }> = [
    { id: "home", label: "Overview", icon: Home },
    { id: "sources", label: "All sources", icon: FolderOpen },
    { id: "favorites", label: "Favorites", icon: Heart },
    { id: "history", label: "History", icon: History },
  ];

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] border-r border-white/10 bg-[#0a0908]/95 backdrop-blur-xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0 ${
          mobileMenu ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col p-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-5">
            <button className="flex items-center gap-3 text-left" onClick={() => setView("home")}>
              <img src="/logo-mark.svg" alt="" className="h-9 w-9 rounded-md" />
              <div>
                <p className="text-[10px] uppercase tracking-micro text-[#897973]">Source launcher</p>
                <p className="text-sm font-semibold tracking-tight">SOURCEDECK</p>
              </div>
            </button>
            <button className="rounded-md p-2 text-[#a49992] hover:bg-white/5 lg:hidden" onClick={() => setMobileMenu(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="mt-6 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setView(item.id);
                    setMobileMenu(false);
                  }}
                  className={`group flex w-full items-center justify-between border px-3 py-3 text-sm transition ${
                    active
                      ? "border-[#9d3715]/70 bg-[#9d3715]/10 text-[#f4f0ea]"
                      : "border-transparent text-[#a49992] hover:border-white/10 hover:bg-white/[0.025] hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  {item.id === "favorites" && favoriteCount > 0 && (
                    <span className="text-[11px] tabular-nums text-[#897973]">{favoriteCount}</span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-7 border-t border-white/10 pt-5">
            <p className="px-3 text-[10px] uppercase tracking-micro text-[#6f605a]">Data</p>
            <button
              onClick={exportData}
              className="mt-2 flex w-full items-center gap-3 px-3 py-2.5 text-sm text-[#a49992] transition hover:bg-white/[0.025] hover:text-white"
            >
              <FileDown className="h-4 w-4" /> Export backup
            </button>
            <button
              onClick={() => importRef.current?.click()}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-[#a49992] transition hover:bg-white/[0.025] hover:text-white"
            >
              <FileUp className="h-4 w-4" /> Import backup
            </button>
            <input ref={importRef} type="file" accept="application/json" onChange={importData} className="hidden" />
          </div>

          <div className="mt-auto border border-white/10 bg-[#11100f] p-4">
            <div className="mb-3 flex items-center justify-between">
              <Sparkles className="h-4 w-4 text-[#c45b36]" />
              <span className="text-[10px] uppercase tracking-micro text-[#6f605a]">Local-first</span>
            </div>
            <p className="text-sm leading-5 text-[#d7cec8]">Your source list stays in this browser until you export or clear it.</p>
          </div>
        </div>
      </aside>

      {mobileMenu && <button aria-label="Close menu" className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={() => setMobileMenu(false)} />}

      <section className="min-w-0">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-white/10 bg-[#0a0908]/85 px-4 backdrop-blur-xl sm:px-7 lg:px-10">
          <div className="flex items-center gap-3">
            <button className="border border-white/10 p-2 lg:hidden" onClick={() => setMobileMenu(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-micro text-[#6f605a]">Adaptive resource platform</p>
              <p className="mt-0.5 text-sm font-medium text-[#d7cec8]">Web source workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 border border-[#9d3715]/70 bg-[#9d3715]/10 px-4 py-2.5 text-sm font-semibold text-[#f4f0ea] transition hover:bg-[#9d3715]/20"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Watch</span>
          </Link>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 bg-[#f4f0ea] px-4 py-2.5 text-sm font-semibold text-[#0a0908] transition hover:bg-white"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add source</span>
          </button>
          </div>
        </header>

        <div className="mx-auto max-w-[1480px] px-4 py-7 sm:px-7 lg:px-10 lg:py-10">
          {view === "home" && (
            <div className="animate-fade-up">
              <section className="relative overflow-hidden border border-white/10 bg-[#11100f] shadow-glow">
                <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden="true">
                  <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full border border-[#9d3715]/30" />
                  <div className="absolute -right-4 top-8 h-36 w-36 rounded-full border border-white/10" />
                  <div className="absolute bottom-0 right-[25%] h-px w-56 rotate-[-28deg] bg-gradient-to-r from-transparent via-[#9d3715] to-transparent" />
                </div>

                <div className="relative grid gap-10 p-6 sm:p-9 lg:grid-cols-[1.2fr_.8fr] lg:p-12">
                  <div>
                    <div className="mb-8 flex items-center gap-2 text-[10px] uppercase tracking-micro text-[#897973]">
                      <span className="h-2 w-2 bg-[#9d3715]" />
                      One workspace / any website
                    </div>
                    <h1 className="max-w-3xl text-4xl font-medium leading-[0.98] tracking-[-0.05em] sm:text-5xl lg:text-7xl">
                      Your sources,
                      <br />
                      <span className="text-[#897973]">without the clutter.</span>
                    </h1>
                    <p className="mt-6 max-w-xl text-sm leading-6 text-[#a49992] sm:text-base">
                      Save websites you use, launch them instantly, and keep a local history. Built as a clean web companion now and a foundation for your future Android app.
                    </p>
                  </div>

                  <div className="flex flex-col justify-end">
                    <p className="mb-3 text-[10px] uppercase tracking-micro text-[#6f605a]">Quick open</p>
                    <form onSubmit={handleQuickOpen} className="border border-white/15 bg-[#0a0908] p-2">
                      <div className="flex items-center gap-2">
                        <Globe2 className="ml-2 h-4 w-4 shrink-0 text-[#897973]" />
                        <input
                          value={quickUrl}
                          onChange={(e) => setQuickUrl(e.target.value)}
                          placeholder="example.com"
                          className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm text-white outline-none placeholder:text-[#6f605a]"
                        />
                        <button
                          type="submit"
                          className="grid h-10 w-10 shrink-0 place-items-center bg-[#9d3715] text-white transition hover:bg-[#b74823]"
                          aria-label="Open website"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </form>
                    {error && !modalOpen && <p className="mt-2 text-xs text-[#d97757]">{error}</p>}
                    <p className="mt-3 text-xs leading-5 text-[#6f605a]">SourceDeck will try the built-in viewer first. If a site blocks embedding, use the external-open fallback in the viewer.</p>
                  </div>
                </div>
              </section>

              <section className="grid border-x border-b border-white/10 sm:grid-cols-3">
                {[
                  { label: "Saved sources", value: sources.length.toString().padStart(2, "0"), note: "Available on this device" },
                  { label: "Favorites", value: favoriteCount.toString().padStart(2, "0"), note: "Pinned for quick access" },
                  { label: "Total launches", value: opens.toString().padStart(2, "0"), note: "Across saved sources" },
                ].map((stat) => (
                  <div key={stat.label} className="border-b border-white/10 p-6 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                    <p className="text-[10px] uppercase tracking-micro text-[#6f605a]">{stat.label}</p>
                    <p className="mt-5 text-4xl font-light tracking-[-0.05em]">{stat.value}</p>
                    <p className="mt-2 text-xs text-[#897973]">{stat.note}</p>
                  </div>
                ))}
              </section>

              <section className="mt-10">
                <SectionHeading eyebrow="Library" title="Recently used" actionLabel="View all" onAction={() => setView("sources")} />
                {recentSources.length ? (
                  <div className="mt-5 grid gap-px border border-white/10 bg-white/10 md:grid-cols-2 xl:grid-cols-4">
                    {recentSources.map((source) => (
                      <SourceCard
                        key={source.id}
                        source={source}
                        compact
                        onOpen={() => openInViewer(source.url, source.name, source.id)}
                        onFavorite={() => toggleFavorite(source.id)}
                        onEdit={() => openEditModal(source)}
                        onDelete={() => removeSource(source.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState onAdd={openAddModal} />
                )}
              </section>

              <section className="mt-12 grid gap-px border border-white/10 bg-white/10 lg:grid-cols-[1.1fr_.9fr]">
                <div className="bg-[#0a0908] p-7 sm:p-9">
                  <p className="text-[10px] uppercase tracking-micro text-[#9d3715]">How it works</p>
                  <h2 className="mt-5 max-w-lg text-3xl font-medium tracking-[-0.04em] sm:text-4xl">A simple launcher now. A stronger Android shell later.</h2>
                  <p className="mt-5 max-w-xl text-sm leading-6 text-[#897973]">This version saves URLs locally and opens them in a built-in web viewer when the source permits embedding. Sites that block framing can still be opened externally. The same source data can later feed a native Android WebView layer.</p>
                </div>
                <div className="bg-[#11100f] p-7 sm:p-9">
                  {["Save a website URL", "Organize and favorite sources", "Track your recent launches", "Export your data before moving devices"].map((item, index) => (
                    <div key={item} className="flex items-center gap-4 border-b border-white/10 py-4 first:pt-0 last:border-b-0 last:pb-0">
                      <span className="grid h-7 w-7 shrink-0 place-items-center border border-white/15 text-[10px] text-[#897973]">0{index + 1}</span>
                      <p className="text-sm text-[#d7cec8]">{item}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {(view === "sources" || view === "favorites") && (
            <div className="animate-fade-up">
              <SectionHeading
                eyebrow={view === "favorites" ? "Pinned library" : "Source library"}
                title={view === "favorites" ? "Favorites" : "All sources"}
                actionLabel="Add source"
                onAction={openAddModal}
              />

              <div className="mt-6 flex flex-col gap-3 border-y border-white/10 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f605a]" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, URL or category"
                    className="w-full border border-white/10 bg-[#11100f] py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-[#6f605a] focus:border-[#9d3715]/70"
                  />
                </div>
                <p className="text-xs uppercase tracking-micro text-[#6f605a]">{visibleSources.length} result{visibleSources.length === 1 ? "" : "s"}</p>
              </div>

              {visibleSources.length ? (
                <div className="mt-6 grid gap-px border border-white/10 bg-white/10 md:grid-cols-2 xl:grid-cols-3">
                  {visibleSources.map((source) => (
                    <SourceCard
                      key={source.id}
                      source={source}
                      onOpen={() => openInViewer(source.url, source.name, source.id)}
                      onFavorite={() => toggleFavorite(source.id)}
                      onEdit={() => openEditModal(source)}
                      onDelete={() => removeSource(source.id)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState onAdd={openAddModal} message={search ? "No sources match your search." : undefined} />
              )}
            </div>
          )}

          {view === "history" && (
            <div className="animate-fade-up">
              <SectionHeading
                eyebrow="Activity"
                title="Launch history"
                actionLabel={history.length ? "Clear history" : undefined}
                onAction={history.length ? () => window.confirm("Clear launch history?") && setHistory([]) : undefined}
              />

              <div className="mt-7 border border-white/10 bg-[#11100f]">
                {history.length ? (
                  history.map((entry, index) => (
                    <button
                      key={entry.id}
                      onClick={() => openInViewer(entry.url, entry.name, entry.sourceId)}
                      className="group grid w-full grid-cols-[44px_1fr_auto] items-center gap-4 border-b border-white/10 p-4 text-left transition last:border-b-0 hover:bg-white/[0.025] sm:p-5"
                    >
                      <span className="grid h-11 w-11 place-items-center border border-white/10 bg-[#0a0908] text-xs font-semibold text-[#a49992]">{initials(entry.name)}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-[#e9e2dc]">{entry.name}</span>
                        <span className="mt-1 block truncate text-xs text-[#6f605a]">{hostname(entry.url)}</span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="hidden text-xs text-[#6f605a] sm:inline">{formatRelative(entry.openedAt)}</span>
                        <ExternalLink className="h-4 w-4 text-[#6f605a] transition group-hover:text-[#c45b36]" />
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-10 text-center">
                    <Clock3 className="mx-auto h-6 w-6 text-[#6f605a]" />
                    <p className="mt-4 text-sm text-[#a49992]">Nothing opened yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
          <button className="absolute inset-0" aria-label="Close modal" onClick={() => setModalOpen(false)} />
          <div className="relative z-10 w-full max-w-xl border border-white/15 bg-[#11100f] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <p className="text-[10px] uppercase tracking-micro text-[#6f605a]">Library entry</p>
                <h2 className="mt-1 text-xl font-medium">{editingId ? "Edit source" : "Add a source"}</h2>
              </div>
              <button className="border border-white/10 p-2 text-[#897973] hover:text-white" onClick={() => setModalOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitSource} className="space-y-5 p-6">
              <Field label="Source name">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="My anime source"
                  className="field-input"
                  autoFocus
                />
              </Field>
              <Field label="Website URL">
                <input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://example.com"
                  className="field-input"
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Category">
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as SourceCategory })}
                    className="field-input appearance-none"
                  >
                    {categories.map((category) => (
                      <option value={category} key={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Description (optional)">
                  <input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="What you use this for"
                    className="field-input"
                  />
                </Field>
              </div>

              {error && <p className="border border-[#9d3715]/40 bg-[#9d3715]/10 px-4 py-3 text-xs text-[#e39478]">{error}</p>}

              <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-5">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 text-sm text-[#897973] hover:text-white">
                  Cancel
                </button>
                <button type="submit" className="bg-[#f4f0ea] px-5 py-2.5 text-sm font-semibold text-[#0a0908] hover:bg-white">
                  {editingId ? "Save changes" : "Add source"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .field-input {
          width: 100%;
          border: 1px solid rgba(244, 240, 234, 0.12);
          background: #0a0908;
          padding: 0.8rem 0.9rem;
          color: #f4f0ea;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 160ms ease;
        }
        .field-input::placeholder {
          color: #6f605a;
        }
        .field-input:focus {
          border-color: rgba(157, 55, 21, 0.8);
        }
      `}</style>
    </main>
  );
}

function SectionHeading({
  eyebrow,
  title,
  actionLabel,
  onAction,
}: {
  eyebrow: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-end justify-between gap-5">
      <div>
        <p className="text-[10px] uppercase tracking-micro text-[#6f605a]">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-medium tracking-[-0.04em] sm:text-4xl">{title}</h2>
      </div>
      {actionLabel && onAction && (
        <button onClick={onAction} className="group flex items-center gap-2 text-sm text-[#a49992] transition hover:text-white">
          {actionLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] uppercase tracking-micro text-[#6f605a]">{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ onAdd, message }: { onAdd: () => void; message?: string }) {
  return (
    <div className="mt-5 border border-dashed border-white/15 bg-[#11100f]/70 px-6 py-14 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center border border-white/10 bg-[#0a0908]">
        <Globe2 className="h-5 w-5 text-[#897973]" />
      </div>
      <p className="mt-5 text-sm text-[#d7cec8]">{message ?? "Your source library is empty."}</p>
      {!message && <p className="mt-2 text-xs text-[#6f605a]">Add the sites you want quick access to.</p>}
      <button onClick={onAdd} className="mt-5 inline-flex items-center gap-2 bg-[#f4f0ea] px-4 py-2.5 text-sm font-semibold text-[#0a0908]">
        <Plus className="h-4 w-4" /> Add source
      </button>
    </div>
  );
}

function SourceCard({
  source,
  compact = false,
  onOpen,
  onFavorite,
  onEdit,
  onDelete,
}: {
  source: SavedSource;
  compact?: boolean;
  onOpen: () => void;
  onFavorite: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menu, setMenu] = useState(false);

  return (
    <article className={`relative bg-[#11100f] transition hover:bg-[#151311] ${compact ? "p-5" : "p-6"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center border border-white/10 bg-[#0a0908] text-xs font-semibold text-[#d7cec8]">{initials(source.name)}</div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-[#e9e2dc]">{source.name}</h3>
            <p className="mt-1 truncate text-xs text-[#6f605a]">{hostname(source.url)}</p>
          </div>
        </div>
        <div className="relative flex items-center gap-1">
          <button
            onClick={onFavorite}
            className={`p-2 transition ${source.favorite ? "text-[#c45b36]" : "text-[#6f605a] hover:text-white"}`}
            aria-label={source.favorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Star className={`h-4 w-4 ${source.favorite ? "fill-current" : ""}`} />
          </button>
          <button onClick={() => setMenu((value) => !value)} className="p-2 text-[#6f605a] hover:text-white" aria-label="Source actions">
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menu && (
            <div className="absolute right-0 top-10 z-20 w-36 border border-white/10 bg-[#0a0908] p-1 shadow-2xl">
              <button
                onClick={() => {
                  setMenu(false);
                  onEdit();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#a49992] hover:bg-white/5 hover:text-white"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                onClick={() => {
                  setMenu(false);
                  onDelete();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#d97757] hover:bg-white/5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {!compact && (
        <>
          <p className="mt-6 min-h-10 text-sm leading-5 text-[#897973]">{source.description || "Saved web source"}</p>
          <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
            <span className="text-[10px] uppercase tracking-micro text-[#6f605a]">{source.category}</span>
            <span className="text-xs text-[#6f605a]">{formatRelative(source.lastOpenedAt)}</span>
          </div>
        </>
      )}

      {compact && <p className="mt-5 text-xs text-[#6f605a]">{formatRelative(source.lastOpenedAt)}</p>}

      <button onClick={onOpen} className="group mt-5 flex w-full items-center justify-between border border-white/10 px-3 py-2.5 text-xs font-medium text-[#d7cec8] transition hover:border-[#9d3715]/70 hover:bg-[#9d3715]/10 hover:text-white">
        Open in SourceDeck
        <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </button>
    </article>
  );
}
