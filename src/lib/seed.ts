import raw from "./seed-data.json";
import type { Article } from "./types";
import { validateSources } from "./validation";

type RawArticle = Omit<Article, "publishedAt" | "verification"> & { hoursAgo: number };

/** Noticias FICTICIAS de ejemplo para modo demo y para sembrar Firestore. */
export function seedArticles(now = Date.now()): Article[] {
  return (raw as unknown as RawArticle[]).map(({ hoursAgo, ...a }) => ({
    ...a,
    // El estado sale de la misma regla que usa el portal: una sola fuente de verdad.
    verification: validateSources(a.sources).verification ?? "en_desarrollo",
    publishedAt: now - hoursAgo * 3_600_000,
  }));
}
