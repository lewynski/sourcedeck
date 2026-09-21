/** Local-first library: saved titles + per-episode watch progress (localStorage). */

export type LibraryEntry = {
  sourceId: string;
  itemId: string;
  title: string;
  cover: string;
  addedAt: string;
};

export type Progress = {
  sourceId: string;
  itemId: string;
  episodeId: string;
  episodeNumber: number;
  episodeTitle: string;
  itemTitle: string;
  cover: string;
  position: number;
  duration: number;
  completed: boolean;
  updatedAt: string;
};

const LIBRARY_KEY = "sourcedeck.library.v1";
const PROGRESS_KEY = "sourcedeck.progress.v1";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable */
  }
}

const pkey = (sourceId: string, itemId: string, episodeId: string) => `${sourceId}::${itemId}::${episodeId}`;

export function getLibrary(): LibraryEntry[] {
  return read<LibraryEntry[]>(LIBRARY_KEY, []);
}

export function isInLibrary(sourceId: string, itemId: string) {
  return getLibrary().some((e) => e.sourceId === sourceId && e.itemId === itemId);
}

/** Returns true if the title is in the library after the toggle. */
export function toggleLibrary(entry: Omit<LibraryEntry, "addedAt">): boolean {
  const list = getLibrary();
  const exists = list.some((e) => e.sourceId === entry.sourceId && e.itemId === entry.itemId);
  if (exists) {
    write(LIBRARY_KEY, list.filter((e) => !(e.sourceId === entry.sourceId && e.itemId === entry.itemId)));
    return false;
  }
  write(LIBRARY_KEY, [{ ...entry, addedAt: new Date().toISOString() }, ...list]);
  return true;
}

function allProgress() {
  return read<Record<string, Progress>>(PROGRESS_KEY, {});
}

export function getProgress(sourceId: string, itemId: string, episodeId: string): Progress | undefined {
  return allProgress()[pkey(sourceId, itemId, episodeId)];
}

/** episodeId → progress for one title. */
export function getTitleProgress(sourceId: string, itemId: string): Record<string, Progress> {
  const out: Record<string, Progress> = {};
  for (const p of Object.values(allProgress())) {
    if (p.sourceId === sourceId && p.itemId === itemId) out[p.episodeId] = p;
  }
  return out;
}

export function saveProgress(p: Omit<Progress, "updatedAt" | "completed"> & { completed?: boolean }) {
  const all = allProgress();
  const completed = p.completed ?? (p.duration > 0 && p.position / p.duration > 0.92);
  all[pkey(p.sourceId, p.itemId, p.episodeId)] = { ...p, completed, updatedAt: new Date().toISOString() };
  // keep the store bounded
  const entries = Object.entries(all).sort((a, b) => b[1].updatedAt.localeCompare(a[1].updatedAt)).slice(0, 500);
  write(PROGRESS_KEY, Object.fromEntries(entries));
}

/** Most recent unfinished episode per title. */
export function getContinueWatching(limit = 12): Progress[] {
  const latest = new Map<string, Progress>();
  for (const p of Object.values(allProgress())) {
    const k = `${p.sourceId}::${p.itemId}`;
    const current = latest.get(k);
    if (!current || p.updatedAt > current.updatedAt) latest.set(k, p);
  }
  return [...latest.values()]
    .filter((p) => !p.completed && p.position > 5)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

/** Where to go to resume a progress entry. */
export function resumeHref(p: Progress) {
  const base = `/watch?source=${encodeURIComponent(p.sourceId)}&id=${encodeURIComponent(p.itemId)}&ep=${encodeURIComponent(p.episodeId)}`;
  return p.sourceId === "direct" ? `${base}&url=${encodeURIComponent(p.itemId)}&title=${encodeURIComponent(p.itemTitle)}` : base;
}
