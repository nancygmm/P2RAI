import type { Article, SimLocation } from "./types";
import { geoScore, recencyScore } from "./relevance";
import { LOCATIONS } from "./locations";

export function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Palabras de relleno: no dicen de que trata la pregunta.
const STOP = new Set((
  "a al algo ante como con cual cuales cuando de del desde donde el ella ellos en entre es esa ese eso esta este esto " +
  "ha hay la las le lo los mas me mi mis no nos o para pero por que qué se si sin sobre su sus te tu tus un una uno unos unas y ya hoy " +
  "dime dame cuentame cuenta explica explicame resume resumen resumeme quiero quisiera saber puedes podrias muestrame mostrar ver " +
  "informacion info noticia noticias pasa paso pasando pasado ocurre ocurrio sucede sucedio novedades novedad " +
  "nuevo nueva nuevos nuevas ultima ultimas ultimo ultimos reciente recientes actual actuales " +
  "importante importantes relevante relevantes principal principales todo toda todos todas cosas cosa tema temas semana dia dias"
).split(" "));

// Intencion geografica. Las palabras de intencion no cuentan como tema de la pregunta.
const LOCAL_HINT = /\b(aqui|aca|cerca|cercanas?|mi zona|(mi|la|esta) ciudad|(mi|el|del|este) pais|mi departamento|locales?|donde vivo)\b/;
const NATIONAL_HINT = /\b(nacional(es)?|(mi|el|del|este) pais)\b/;
const REGION_HINT = /\b(mi region|la region|regional|regionales)\b/;
const INTL_HINT = /\b(mundo|mundial(es)?|internacional(es)?|extranjer[oa]s?|exterior|afuera|lejos|global(es)?|otros? pais(es)?|otras? region(es)?|fuera (de|del))\b/;
/** "fuera de Guatemala": el lugar nombrado se excluye en vez de exigirse. */
const OUTSIDE_HINT = /\bfuera (de|del)\b/;
const INTENT_WORDS = new Set((
  "aqui aca cerca cercana cercanas zona ciudad pais paises departamento vivo local locales nacional nacionales " +
  "region regiones regional regionales mundo mundial mundiales internacional internacionales extranjero extranjera " +
  "extranjeros extranjeras exterior afuera lejos global globales otro otros otra otras fuera resto"
).split(" "));

/**
 * Raiz aproximada: sin plural ni vocal final ("vacunas" ~ "vacun", "economica" ~ "economic").
 * Dos raices coinciden si son iguales o una es prefijo de la otra con al menos 5 letras y
 * poca diferencia: "vacun" ~ "vacunacion", pero "transpor" no ~ "transparenci" y "auto" no ~ "autoridad".
 */
function stem(t: string): string {
  let s = t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t;
  if (s.length > 5 && /[aeo]$/.test(s)) s = s.slice(0, -1);
  return s;
}
function sameStem(a: string, b: string): boolean {
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 5 && long.length - short.length <= 5 && long.startsWith(short);
}
function words(s: string): string[] {
  return normalize(s).split(/[^a-z0-9]+/).filter((t) => t.length > 2);
}
function stems(s: string): string[] {
  return words(s).filter((t) => !STOP.has(t)).map(stem);
}

// Lugares que se reconocen en una pregunta aunque ninguna noticia hable de ellos: asi el chat
// puede decir "no hay noticias sobre Francia" en vez de responder con noticias de otro pais.
const KNOWN_PLACES = [
  "Alemania", "Arabia Saudita", "Argentina", "Australia", "Bélgica", "Belice", "Bolivia", "Brasil", "Canadá", "China",
  "Colombia", "Corea del Norte", "Corea del Sur", "Costa Rica", "Cuba", "Ecuador", "Egipto", "El Salvador", "España", "Estados Unidos",
  "Francia", "Gaza", "Grecia", "Guatemala", "Haití", "Honduras", "India", "Indonesia", "Inglaterra", "Irán", "Israel", "Italia",
  "Japón", "México", "Nicaragua", "Nigeria", "Noruega", "Países Bajos", "Palestina", "Panamá", "Paraguay", "Perú",
  "Polonia", "Portugal", "Puerto Rico", "Reino Unido", "República Dominicana", "Rusia", "Siria", "Sudáfrica", "Suecia", "Suiza",
  "Turquía", "Ucrania", "Uruguay", "Vaticano", "Venezuela",
  "África", "América Latina", "Asia", "Caribe", "Centroamérica", "Europa", "Latinoamérica", "Medio Oriente", "Norteamérica",
  "Oceanía", "Oriente Medio", "Sudamérica",
];
// Gentilicios, alias y nombres ambiguos (solo cuentan como lugar tras "en/de/desde/sobre") -> nombre canonico.
const ALIASES: [RegExp, string, string][] = [
  [/\bguatemaltec[oa]s?\b|\bchapin(es)?\b/, "guatemala", "Guatemala"],
  [/\bsalvadoren[oa]s?\b/, "el salvador", "El Salvador"],
  [/\bmexican[oa]s?\b/, "mexico", "México"],
  [/\bcolombian[oa]s?\b/, "colombia", "Colombia"],
  [/\bespanol(a|es|as)\b/, "espana", "España"],
  [/\bfrances(a|es|as)?\b/, "francia", "Francia"],
  [/\bhondurenos?\b|\bhondurenas?\b/, "honduras", "Honduras"],
  [/\bcentroamerican[oa]s?\b/, "centroamerica", "Centroamérica"],
  [/\beurope[oa]s?\b/, "europa", "Europa"],
  [/\blatinoamerican[oa]s?\b/, "latinoamerica", "Latinoamérica"],
  [/\bestadounidenses?\b|\bee\.? ?uu\.?|\beeuu\b|\busa\b/, "estados unidos", "Estados Unidos"],
  [/\b(en|de|desde|sobre) chile\b/, "chile", "Chile"],
  [/\b(en|de|desde|sobre) jamaica\b/, "jamaica", "Jamaica"],
  [/\bmadrilen[oa]s?\b/, "madrid", "Madrid"],
  [/\bbogotan[oa]s?\b/, "bogota", "Bogotá"],
  [/\bxela\b/, "quetzaltenango", "Quetzaltenango"],
  [/\bantigua\b(?! guatemala)/, "antigua guatemala", "Antigua Guatemala"],
  [/\bcdmx\b/, "ciudad de mexico", "Ciudad de México"],
];

interface Gazetteer { names: { key: string; display: string }[] }

function gazetteer(articles: Article[]): Gazetteer {
  const display = new Map<string, string>();
  const add = (n?: string) => { if (n) { const k = normalize(n); if (!display.has(k)) display.set(k, n); } };
  KNOWN_PLACES.forEach(add);
  for (const l of LOCATIONS) [l.city, l.department, l.country, l.region].forEach(add);
  for (const a of articles) for (const p of a.places) [p.city, p.department, p.country, p.region].forEach(add);
  // Los nombres largos primero: "antigua guatemala" no debe contar tambien como "guatemala".
  const names = [...display].map(([key, d]) => ({ key, display: d })).sort((x, y) => y.key.length - x.key.length);
  return { names };
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Lugares nombrados en la pregunta (claves normalizadas) y el texto restante sin esos nombres. */
function findPlaces(nq: string, g: Gazetteer): { places: Map<string, string>; rest: string } {
  const places = new Map<string, string>();
  let rest = ` ${nq} `;
  for (const [re, key, display] of ALIASES) {
    if (re.test(rest)) { places.set(key, display); rest = rest.replace(new RegExp(re.source, "g"), " "); }
  }
  for (const n of g.names) {
    const re = new RegExp(`(^|[^a-z0-9])${escape(n.key)}(?=[^a-z0-9]|$)`, "g");
    if (re.test(rest)) { places.set(n.key, n.display); rest = rest.replace(re, "$1 "); }
  }
  return { places, rest };
}

const FIELDS = ["city", "department", "country", "region"] as const;

/**
 * Cuanto se refiere la noticia a los lugares mencionados: 5 si el lugar es su foco
 * (su campo mas especifico), 2 si solo lo contiene (una nota de una ciudad "esta" en su region).
 */
function placeMatch(a: Article, mentioned: Map<string, string>): number {
  let best = 0;
  for (const p of a.places) {
    const focus = FIELDS.find((f) => p[f]);
    for (const f of FIELDS) {
      const v = p[f];
      if (v && mentioned.has(normalize(v))) best = Math.max(best, f === focus ? 5 : 2);
    }
  }
  return best;
}

interface Indexed { a: Article; title: string[]; summary: string[]; body: string[]; topics: string[] }

export interface Retrieval {
  articles: Article[];
  /** Lugares que la pregunta menciona y de los que no hay ninguna noticia publicada (de ningun tema). */
  missing: string[];
}

/**
 * Recuperacion sin IA ni embeddings: con decenas de noticias basta con coincidencia de
 * palabras (con raiz aproximada), lugar, intencion geografica y fecha.
 */
export function retrieve(question: string, articles: Article[], loc: SimLocation, limit = 6, now = Date.now()): Retrieval {
  const nq = normalize(question);
  const wantsLocal = LOCAL_HINT.test(nq);
  const wantsNational = NATIONAL_HINT.test(nq);
  const wantsRegion = REGION_HINT.test(nq);
  const outside = OUTSIDE_HINT.test(nq);
  const wantsIntl = INTL_HINT.test(nq);
  const found = findPlaces(nq, gazetteer(articles));
  // "fuera de X": X no se exige, se excluye.
  const excluded = outside ? found.places : new Map<string, string>();
  const mentioned = outside ? new Map<string, string>() : found.places;

  const index: Indexed[] = articles.map((a) => ({
    a, title: stems(a.title), summary: stems(a.summary), body: stems(a.body), topics: a.topics.map((t) => stem(normalize(t))),
  }));
  const inCorpus = (t: string) => index.some((x) => [x.title, x.topics, x.summary, x.body].some((list) => list.some((w) => sameStem(w, t))));

  // Palabras de tema. Las que no aparecen en ninguna noticia ("sabes", "ayer", "gracias", "explicamelo")
  // se ignoran si hay otras pistas; si TODAS son desconocidas y no hay lugar ni intencion, la pregunta
  // es ajena a las noticias publicadas ("receta de pastel") y no se responde con cualquier cosa.
  const qAll = words(found.rest).filter((t) => !STOP.has(t) && !INTENT_WORDS.has(t)).map(stem);
  const q = qAll.filter(inCorpus);
  const hasIntent = wantsLocal || wantsNational || wantsRegion || wantsIntl || mentioned.size > 0 || excluded.size > 0;
  if (qAll.length > 0 && q.length === 0 && !hasIntent) return { articles: [], missing: [] };
  const generic = q.length === 0;

  const matchedPlaces = new Set<string>();
  const scored = index.map(({ a, title, summary, body, topics }) => {
    let s = 0;
    const pm = mentioned.size ? placeMatch(a, mentioned) : 0;
    if (pm > 0) {
      for (const p of a.places) for (const f of FIELDS) { const v = p[f]; if (v && mentioned.has(normalize(v))) matchedPlaces.add(normalize(v)); }
    }
    if (excluded.size && placeMatch(a, excluded) > 0) return { a, s: 0 };
    if (q.length) {
      for (const t of q) {
        if (title.some((x) => sameStem(x, t))) s += 3;
        if (topics.some((x) => sameStem(x, t))) s += 3;
        if (summary.some((x) => sameStem(x, t))) s += 2;
        if (body.some((x) => sameStem(x, t))) s += 1;
      }
      // Habia tema en la pregunta y la noticia no lo menciona: no es candidata.
      if (s === 0) return { a, s: 0 };
    }
    if (mentioned.size) {
      if (pm > 0) s += pm;
      else if (!(wantsIntl && a.scope === "internacional")) return { a, s: 0 }; // pregunto por un lugar y la noticia es de otro
    }
    const geo = geoScore(a, loc), rec = recencyScore(a, now);
    // "Cerca", "aquí", "mi país": lo de otro país no es respuesta (salvo que nombre un lugar o pida lo internacional).
    if ((wantsLocal || wantsNational) && !mentioned.size && !wantsIntl && geo < 0.45) return { a, s: 0 };
    if (wantsLocal) s += geo >= 0.45 ? 2 + geo * 4 : 0;
    if (wantsNational && a.scope === "nacional" && geo >= 0.45) s += 3;
    if (wantsRegion) s += (geo >= 0.3 ? 2 + geo * 2 : 0) + (a.scope === "regional" && geo >= 0.3 ? 3 : 0);
    // Lo internacional de verdad primero; lo nacional/regional de otra region despues. Una nota
    // local de otro pais (buses de Bogota) no es "lo que pasa en el mundo".
    if (wantsIntl) s += a.scope === "internacional" ? 5 : geo < 0.3 && a.scope !== "local" ? 2 : 0;
    if (generic && !hasIntent) {
      s += rec * 2 + geo * 2 + (a.scope === "internacional" ? 0.5 : 0);
    }
    if (s > 0) s += rec * 0.5;
    return { a, s };
  });

  const missing = [...mentioned].filter(([key]) => !matchedPlaces.has(key)).map(([, d]) => d);
  const top = scored.filter((x) => x.s > 0).sort((x, y) => y.s - x.s).slice(0, limit).map((x) => x.a);
  return { articles: top, missing };
}
