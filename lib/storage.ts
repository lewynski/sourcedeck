import type { HistoryEntry, SavedSource } from "@/types/source";

const SOURCES_KEY = "sourcedeck.sources.v1";
const HISTORY_KEY = "sourcedeck.history.v1";

export function loadSources(): SavedSource[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SOURCES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSources(sources: SavedSource[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOURCES_KEY, JSON.stringify(sources));
}

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHistory(history: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 100)));
}
