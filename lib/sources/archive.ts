import type {
  CatalogItem,
  CatalogPage,
  CatalogSource,
  Episode,
  Playback,
  SubtitleTrack,
  TitleDetails,
} from "./types";

/**
 * Internet Archive — public-domain and openly licensed films, cartoons and TV.
 * Free public API with CORS enabled, so it works from the browser and from a
 * Capacitor/Android app with no backend. https://archive.org/services/docs/api/
 */

const BASE = "https://archive.org";
const PAGE_SIZE = 24;

const CATEGORIES = [
  { id: "all", label: "All video" },
  { id: "animationandcartoons", label: "Animation & cartoons" },
  { id: "feature_films", label: "Feature films" },
  { id: "classic_tv", label: "Classic TV" },
  { id: "opensource_movies", label: "Community video" },
];

type ArchiveFile = { name: string; format?: string; size?: string; source?: string };
type ArchiveMeta = {
  metadata: Record<string, unknown>;
  files: ArchiveFile[];
};

const metaCache = new Map<string, Promise<ArchiveMeta>>();

function cleanTerm(value: string) {
  return value.replace(/["\\()[\]{}:^~*?!&|+\-/]/g, " ").replace(/\s+/g, " ").trim();
}

function first(value: unknown): string {
  if (Array.isArray(value)) return first(value[0]);
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function stripHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Internet Archive returned ${res.status}`);
  return res.json();
}

async function runQuery(q: string, sort: string, page: number): Promise<CatalogPage> {
  const params = new URLSearchParams({ q, rows: String(PAGE_SIZE), page: String(page), output: "json" });
  ["identifier", "title", "year", "creator"].forEach((f) => params.append("fl[]", f));
  params.append("sort[]", sort);
  const json = await getJson<{
    response: { numFound: number; docs: { identifier: string; title?: unknown; year?: unknown; creator?: unknown }[] };
  }>(`${BASE}/advancedsearch.php?${params}`);

  const items: CatalogItem[] = json.response.docs.map((doc) => ({
    id: doc.identifier,
    title: first(doc.title) || doc.identifier,
    cover: `${BASE}/services/img/${doc.identifier}`,
    subtitle: [first(doc.year), first(doc.creator)].filter(Boolean).join(" · ") || undefined,
  }));
  return { items, hasNext: page * PAGE_SIZE < json.response.numFound };
}

function baseQuery(category?: string) {
  // Only playable video, and keep the catalog family-friendly by excluding the Archive's NSFW collection.
  const parts = ["mediatype:(movies)", "-collection:(nsfw)"];
  if (category && category !== "all") parts.push(`collection:(${category})`);
  return parts.join(" AND ");
}

function loadMeta(id: string) {
  if (!metaCache.has(id)) {
    metaCache.set(id, getJson<ArchiveMeta>(`${BASE}/metadata/${encodeURIComponent(id)}`));
  }
  return metaCache.get(id)!;
}

const VIDEO_EXT = /\.(mp4|m4v|webm|ogv)$/i;
const DERIVED_SUFFIX = /(_\d+kb|\.ia|_512kb)$/i;

function fileKey(name: string) {
  return name.replace(VIDEO_EXT, "").replace(DERIVED_SUFFIX, "");
}

function fileRank(name: string) {
  let rank = /\.(mp4|m4v)$/i.test(name) ? 0 : /\.webm$/i.test(name) ? 1 : 2;
  if (DERIVED_SUFFIX.test(name.replace(VIDEO_EXT, ""))) rank += 10; // prefer the full-quality file
  return rank;
}

function videoFiles(files: ArchiveFile[]) {
  const best = new Map<string, ArchiveFile>();
  for (const file of files) {
    if (!VIDEO_EXT.test(file.name)) continue;
    if (file.size && Number(file.size) < 50_000) continue; // ignore tiny samples
    const key = fileKey(file.name);
    const current = best.get(key);
    if (!current || fileRank(file.name) < fileRank(current.name)) best.set(key, file);
  }
  return [...best.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

function downloadUrl(id: string, name: string) {
  const path = name.split("/").map(encodeURIComponent).join("/");
  return `${BASE}/download/${encodeURIComponent(id)}/${path}`;
}

function prettify(name: string) {
  return name
    .replace(/^.*\//, "")
    .replace(VIDEO_EXT, "")
    .replace(DERIVED_SUFFIX, "")
    .replace(/[_.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const archiveSource: CatalogSource = {
  id: "archive",
  name: "Internet Archive",
  description: "Public-domain and openly licensed films, cartoons and classic TV.",
  language: "en",
  categories: CATEGORIES,

  popular: (page, category) => runQuery(baseQuery(category), "downloads desc", page),
  latest: (page, category) => runQuery(baseQuery(category), "addeddate desc", page),
  search: (query, page, category) => {
    const term = cleanTerm(query);
    const text = term ? ` AND (title:(${term}) OR creator:(${term}) OR subject:(${term}))` : "";
    return runQuery(baseQuery(category) + text, "downloads desc", page);
  },

  async details(id): Promise<TitleDetails> {
    const { metadata } = await loadMeta(id);
    const subject = metadata.subject;
    return {
      id,
      title: first(metadata.title) || id,
      cover: `${BASE}/services/img/${id}`,
      description: stripHtml(first(metadata.description)) || "No description provided.",
      genres: (Array.isArray(subject) ? subject : subject ? String(subject).split(/;\s*/) : []).slice(0, 8).map(String),
      year: first(metadata.year) || first(metadata.date).slice(0, 4) || undefined,
      creator: first(metadata.creator) || undefined,
    };
  },

  async episodes(id): Promise<Episode[]> {
    const { files, metadata } = await loadMeta(id);
    const videos = videoFiles(files);
    if (videos.length === 1) {
      return [{ id: videos[0].name, number: 1, title: first(metadata.title) || "Play" }];
    }
    return videos.map((file, index) => ({ id: file.name, number: index + 1, title: prettify(file.name) }));
  },

  async playback(itemId, episodeId): Promise<Playback> {
    const { files } = await loadMeta(itemId);
    const key = fileKey(episodeId);
    const subtitles: SubtitleTrack[] = files
      .filter((f) => /\.vtt$/i.test(f.name) && f.name.replace(/\.vtt$/i, "").startsWith(key))
      .map((f) => ({ label: prettify(f.name.replace(/\.vtt$/i, "")) || "Subtitles", lang: "und", url: downloadUrl(itemId, f.name) }));
    return {
      streams: [{ url: downloadUrl(itemId, episodeId), kind: "file" }],
      subtitles,
    };
  },
};
