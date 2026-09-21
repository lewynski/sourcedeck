export type SourceCategory = "Anime" | "Manga" | "Streaming" | "Media" | "Community" | "Other";

export type SavedSource = {
  id: string;
  name: string;
  url: string;
  description: string;
  category: SourceCategory;
  favorite: boolean;
  createdAt: string;
  lastOpenedAt?: string;
  openCount: number;
};

export type HistoryEntry = {
  id: string;
  sourceId?: string;
  name: string;
  url: string;
  openedAt: string;
};
