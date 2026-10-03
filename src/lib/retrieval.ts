import type { Article, SimLocation } from "./types";
import { geoScore, recencyScore } from "./relevance";

const STOP = new Set("a al algo ante como con cual cuales cuando de del desde donde el ella ellos en entre es esa ese eso esta este esto ha hay la las le lo los mas me mi no nos o para pero por que qué se si sin sobre su sus te tu un una uno y ya hoy dime cuentame explica explicame resume resumen noticia noticias pasa paso pasó pasando novedades nuevo nueva ultimas ultimos reciente recientes importante importantes".split(" "));

export function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function tokens(s: string): string[] {
  return normalize(s).split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !STOP.has(t));
}

const LOCAL_HINT = /\b(aqui|aca|cerca|mi zona|mi region|mi ciudad|mi pais|local|locales|donde vivo)\b/;

/**
 * Recuperacion sin IA ni embeddings: con decenas de noticias basta con
 * coincidencia de palabras, lugar y fecha. Devuelve las mejores candidatas.
 */
export function retrieve(question: string, articles: Article[], loc: SimLocation, limit = 6, now = Date.now()): Article[] {
  const q = tokens(question);
  const nq = normalize(question);
  const wantsLocal = LOCAL_HINT.test(nq);
  const generic = q.length === 0;

  const scored = articles.map((a) => {
    let s = 0;
    const title = tokens(a.title), summary = tokens(a.summary), body = tokens(a.body);
    const topics = a.topics.map(normalize);
    for (const t of q) {
      if (title.includes(t)) s += 3;
      if (topics.some((x) => x.includes(t) || t.includes(x))) s += 3;
      if (summary.includes(t)) s += 2;
      if (body.includes(t)) s += 1;
    }
    for (const p of a.places) {
      for (const name of [p.city, p.department, p.country, p.region]) {
        if (name && nq.includes(normalize(name))) s += 4;
      }
    }
    const geo = geoScore(a, loc), rec = recencyScore(a, now);
    if (wantsLocal) s += geo >= 0.45 ? geo * 5 : 0;
    if (generic && !wantsLocal) s += rec * 2 + geo * 2 + (a.scope === "internacional" ? 0.5 : 0);
    if (s > 0) s += rec * 0.5;
    return { a, s };
  });

  return scored.filter((x) => x.s > 0).sort((x, y) => y.s - x.s).slice(0, limit).map((x) => x.a);
}
