/**
 * SourceDeck's source contract — the equivalent of a Tachiyomi/Aniyomi "extension".
 * The app never scrapes or renders a site itself: it asks a source for structured
 * data (catalog → details → episodes → playable streams) and shows it in its own
 * library UI and player. Adding a new source = one file implementing CatalogSource
 * plus one line in lib/sources/index.ts.
 */

export type CatalogItem = {
  id: string;
  title: string;
  cover: string;
  subtitle?: string;
};

export type CatalogPage = {
  items: CatalogItem[];
  hasNext: boolean;
};

export type TitleDetails = CatalogItem & {
  description: string;
  genres: string[];
  year?: string;
  creator?: string;
};

export type Episode = {
  id: string;
  number: number;
  title: string;
};

export type StreamSource = {
  url: string;
  /** "file" = mp4/webm/ogv played natively, "hls" = .m3u8 played via hls.js/native HLS */
  kind: "file" | "hls";
  label?: string;
};

export type SubtitleTrack = {
  label: string;
  lang: string;
  url: string; // WebVTT
};

export type Playback = {
  streams: StreamSource[];
  subtitles?: SubtitleTrack[];
};

export type SourceCategory = { id: string; label: string };

export interface CatalogSource {
  id: string;
  name: string;
  description: string;
  language: string;
  /** Optional filters shown as tabs in Browse (e.g. collections/genres). */
  categories?: SourceCategory[];
  popular(page: number, category?: string): Promise<CatalogPage>;
  latest(page: number, category?: string): Promise<CatalogPage>;
  search(query: string, page: number, category?: string): Promise<CatalogPage>;
  details(id: string): Promise<TitleDetails>;
  episodes(id: string): Promise<Episode[]>;
  playback(itemId: string, episodeId: string): Promise<Playback>;
}
