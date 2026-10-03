import type { Affinity, Article, SimLocation } from "./types";

/**
 * Relevancia determinista: no usa IA y se puede explicar noticia por noticia.
 * score = 0.40 geo + 0.25 recencia + 0.20 interes + 0.15 alcance
 * Los pesos son un punto de partida; ajustarlos con pruebas es un buen engineering loop.
 */
export const WEIGHTS = { geo: 0.4, recency: 0.25, interest: 0.2, reach: 0.15 };
export const HALF_LIFE_HOURS = 24;
/** Tamano de la zona alta del feed donde se garantizan cupos. */
export const TOP_N = 8;

export type Tier = "hero" | "medium" | "compact";
export type Bucket = "local" | "nacional" | "internacional";

export interface Ranked {
  article: Article;
  score: number;
  parts: { geo: number; recency: number; interest: number; reach: number };
  tier: Tier;
  reason: string;
  /** true si subio por cupo reservado y no por puntaje. */
  reserved: boolean;
}

export function geoScore(a: Article, loc: SimLocation): number {
  let best = 0.1;
  for (const p of a.places) {
    if (p.city && p.city === loc.city) best = Math.max(best, 1);
    else if (p.department && p.department === loc.department && p.country === loc.country) best = Math.max(best, 0.8);
    else if (p.country && p.country === loc.country && !p.city && !p.department) best = Math.max(best, 0.6);
    else if (p.country && p.country === loc.country) best = Math.max(best, 0.45);
    else if (p.region && p.region === loc.region) best = Math.max(best, 0.3);
  }
  return best;
}

export function recencyScore(a: Article, now: number): number {
  const hours = Math.max(0, (now - a.publishedAt) / 3_600_000);
  return Math.pow(0.5, hours / HALF_LIFE_HOURS);
}

export function interestScore(a: Article, affinity: Affinity): number {
  const max = Math.max(0, ...Object.values(affinity));
  if (max <= 0) return 0;
  return Math.max(0, ...a.topics.map((t) => (affinity[t] ?? 0) / max));
}

/** Alcance: se infiere del ambito y de cuantas fuentes confirman. No hay campo "importancia". */
export function reachScore(a: Article, geo: number): number {
  let base: number;
  if (a.scope === "internacional") base = 0.8;
  else if (a.scope === "regional") base = geo >= 0.3 ? 0.6 : 0.3;
  else if (a.scope === "nacional") base = geo >= 0.45 ? 0.8 : 0.35;
  else base = geo >= 0.8 ? 0.6 : 0.1; // local: solo pesa si es tu zona
  const confirming = a.sources.filter((s) => s.supports === "confirma").length;
  return Math.min(1, base + (Math.min(confirming, 3) / 3) * 0.2);
}

export function bucketOf(a: Article, geo: number): Bucket | null {
  if (geo >= 0.8) return "local";
  if (a.scope === "nacional" && geo >= 0.45) return "nacional";
  if (a.scope === "internacional" || geo < 0.3) return "internacional";
  return null;
}

function reasonFor(a: Article, loc: SimLocation, parts: Ranked["parts"], affinity: Affinity, reserved: Bucket | null): string {
  if (reserved === "internacional") return "Para que no te lo pierdas: internacional";
  if (reserved === "nacional") return "Para que no te lo pierdas: nacional";
  if (reserved === "local") return "Para que no te lo pierdas: de tu zona";
  if (parts.geo >= 1) return `Cerca de ti: ${loc.city}`;
  if (parts.geo >= 0.8) return `En tu departamento: ${loc.department}`;
  if (parts.interest >= 0.6) {
    const t = [...a.topics].sort((x, y) => (affinity[y] ?? 0) - (affinity[x] ?? 0))[0];
    return `Tema que sigues: ${t}`;
  }
  if (parts.geo >= 0.45) return `En tu país: ${loc.country}`;
  if (a.scope === "internacional") return "Noticia internacional";
  if (parts.geo >= 0.3) return `En tu región: ${loc.region}`;
  return "Reciente";
}

export function rankFeed(articles: Article[], loc: SimLocation, affinity: Affinity, now = Date.now()): Ranked[] {
  const scored = articles.map((article) => {
    const geo = geoScore(article, loc);
    const parts = {
      geo,
      recency: recencyScore(article, now),
      interest: interestScore(article, affinity),
      reach: reachScore(article, geo),
    };
    const score =
      WEIGHTS.geo * parts.geo + WEIGHTS.recency * parts.recency +
      WEIGHTS.interest * parts.interest + WEIGHTS.reach * parts.reach;
    return { article, score, parts, bucket: bucketOf(article, geo), reservedAs: null as Bucket | null };
  });
  scored.sort((x, y) => y.score - x.score || y.article.publishedAt - x.article.publishedAt);

  // Garantia contra la burbuja: en los primeros TOP_N debe haber al menos una
  // noticia local, una nacional y una internacional (si existen).
  const n = Math.min(TOP_N, scored.length);
  for (const b of ["local", "nacional", "internacional"] as Bucket[]) {
    if (scored.slice(0, n).some((s) => s.bucket === b)) continue;
    const idx = scored.findIndex((s, i) => i >= n && s.bucket === b);
    if (idx === -1) continue;
    // Sale el de menor puntaje del top que no sea el unico de su grupo ni un reservado.
    let out = -1;
    for (let i = n - 1; i >= 1; i--) {
      const s = scored[i];
      if (s.reservedAs) continue;
      const alone = s.bucket && scored.slice(0, n).filter((t) => t.bucket === s.bucket).length === 1;
      if (!alone) { out = i; break; }
    }
    if (out === -1) continue;
    const [promoted] = scored.splice(idx, 1);
    promoted.reservedAs = b;
    const [demoted] = scored.splice(out, 1, promoted);
    scored.splice(n, 0, demoted);
  }

  // La portada no puede ser una noticia sin confirmar.
  if (scored.length && scored[0].article.verification !== "confirmada") {
    const i = scored.findIndex((s) => s.article.verification === "confirmada");
    if (i > 0) scored.unshift(...scored.splice(i, 1));
  }

  return scored.map((s, i) => ({
    article: s.article,
    score: s.score,
    parts: s.parts,
    reserved: !!s.reservedAs,
    tier: i === 0 && s.article.verification === "confirmada" ? "hero" : i <= 2 ? "medium" : "compact",
    reason: reasonFor(s.article, loc, s.parts, affinity, s.reservedAs),
  }));
}
