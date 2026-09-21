import { archiveSource } from "./archive";
import type { CatalogSource } from "./types";

/** Register new sources here. */
export const catalogSources: CatalogSource[] = [archiveSource];

export function getSource(id: string | null | undefined) {
  return catalogSources.find((source) => source.id === id) ?? null;
}

export * from "./types";
