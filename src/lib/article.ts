import type { Article, ArticleImage, ImageOrigin, Place, Scope, Source } from "./types";

const SCOPES: Scope[] = ["local", "nacional", "regional", "internacional"];
const ORIGINS: ImageOrigin[] = ["propia", "licencia_libre", "archivo", "generada_ia", "alterada_ia"];

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const optStr = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
const obj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/** Acepta milisegundos, Timestamp de Firestore ({seconds} o toMillis) o fecha ISO. */
function toMillis(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const o = obj(v);
  if (o && typeof o.toMillis === "function") return (o.toMillis as () => number)();
  if (o && typeof o.seconds === "number") return o.seconds * 1000;
  if (typeof v === "string") { const t = Date.parse(v); if (Number.isFinite(t)) return t; }
  return 0;
}

function toPlace(v: unknown): Place | null {
  const o = obj(v);
  if (!o) return null;
  const p: Place = { city: optStr(o.city), department: optStr(o.department), country: optStr(o.country), region: optStr(o.region) };
  return p.city || p.department || p.country || p.region ? p : null;
}

function toSource(v: unknown): Source | null {
  const o = obj(v);
  if (!o || !str(o.name).trim() || !str(o.url).trim()) return null;
  const type = o.type === "primaria" || o.type === "oficial" ? o.type : "medio";
  return { name: str(o.name), url: str(o.url), type, supports: o.supports === "contradice" ? "contradice" : "confirma" };
}

function toImage(v: unknown): ArticleImage | null {
  const o = obj(v);
  if (!o || !str(o.url)) return null;
  const url = str(o.url);
  // Un origen desconocido se trata como "archivo": nunca se presenta como foto del hecho.
  let origin = ORIGINS.includes(o.origin as ImageOrigin) ? (o.origin as ImageOrigin) : "archivo";
  // Lo que sirve /api/images lo genero la IA de la app: siempre lleva el sello, diga lo que diga el documento.
  if (url.startsWith("/api/images/")) origin = "generada_ia";
  return {
    url, origin, credit: str(o.credit), sourceUrl: optStr(o.sourceUrl), title: optStr(o.title),
    licenseUrl: optStr(o.licenseUrl), model: optStr(o.model), prompt: optStr(o.prompt),
  };
}

/**
 * Convierte un documento (Firestore o datos del cliente) en un Article seguro de usar.
 * Un documento mal formado no debe tumbar el feed ni el chat de todos: se corrige o se descarta.
 * Ante la duda, la verificacion queda en "en_desarrollo".
 */
export function toArticle(id: string, raw: unknown): Article | null {
  const o = obj(raw);
  if (!o || !id || !str(o.title).trim()) return null;
  const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  const sources = list(o.sources).map(toSource).filter((s): s is Source => s !== null);
  return {
    id,
    title: str(o.title),
    summary: str(o.summary),
    summaryOrigin: o.summaryOrigin === "ia" ? "ia" : "humano",
    body: str(o.body),
    topics: list(o.topics).filter((t): t is string => typeof t === "string"),
    scope: SCOPES.includes(o.scope as Scope) ? (o.scope as Scope) : "local",
    places: list(o.places).map(toPlace).filter((p): p is Place => p !== null),
    sources,
    // Sin fuentes no hay confirmacion posible, diga lo que diga el documento.
    verification: o.verification === "confirmada" && sources.length > 0 ? "confirmada" : "en_desarrollo",
    image: toImage(o.image),
    publishedAt: toMillis(o.publishedAt),
    authorUid: optStr(o.authorUid),
  };
}
