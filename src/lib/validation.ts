import type { Source, Verification } from "./types";

export interface ValidationResult {
  canPublish: boolean;
  verification: Verification | null;
  note: string;
  contradictory: boolean;
  /** Indices (en la lista original) de fuentes con enlace invalido. */
  invalid: number[];
}

/** Alguna fuente contradice a las demas (se calcula aunque haya enlaces invalidos). */
export function hasContradiction(sources: Pick<Source, "supports">[]): boolean {
  return sources.some((s) => s.supports === "contradice");
}

/** Devuelve la URL si es un enlace web real (http/https con dominio), o null. */
export function parseSourceUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const host = u.hostname.toLowerCase();
    if (!host.includes(".") || host.startsWith(".") || host.endsWith(".")) return null;
    return u;
  } catch {
    return null;
  }
}

// Segundos niveles tipicos de dominios de pais: prensa.com.gt, minsalud.gob.gt, bbc.co.uk.
const SECOND_LEVEL = new Set(["com", "org", "net", "gob", "gov", "edu", "co", "ac", "mil", "nom", "int", "or", "go"]);

/**
 * Dominio registrable aproximado (eTLD+1): noticias.medio.com y www2.medio.com son el mismo medio.
 * Las URLs .example (RFC 2606) de las noticias ficticias de ejemplo funcionan como cualquier otro TLD.
 */
export function registrableDomain(host: string): string {
  const labels = host.toLowerCase().replace(/\.$/, "").split(".");
  if (labels.length >= 3 && labels[labels.length - 1].length === 2 && SECOND_LEVEL.has(labels[labels.length - 2])) {
    return labels.slice(-3).join(".");
  }
  return labels.slice(-2).join(".");
}

/**
 * Regla de validacion del portal. La decide el codigo a partir de las fuentes
 * registradas por una persona; ningun modelo de IA participa en este veredicto.
 */
export function validateSources(sources: Source[]): ValidationResult {
  const filled = sources
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.name.trim() && s.url.trim());
  if (filled.length === 0) {
    return { canPublish: false, verification: null, contradictory: false, invalid: [], note: "Agrega al menos una fuente con nombre y enlace para poder publicar." };
  }
  const invalid = filled.filter(({ s }) => !parseSourceUrl(s.url)).map(({ i }) => i);
  if (invalid.length > 0) {
    return { canPublish: false, verification: null, contradictory: false, invalid, note: "Hay enlaces de fuente que no son URLs web válidas (deben empezar con https:// y tener un dominio real)." };
  }
  const valid = filled.map(({ s }) => s);
  const confirming = valid.filter((s) => s.supports === "confirma");
  const contradictory = valid.some((s) => s.supports === "contradice");
  if (contradictory) {
    return { canPublish: true, verification: "en_desarrollo", contradictory: true, invalid, note: "Hay fuentes que se contradicen: se publicará como “en desarrollo” con la nota de versiones contradictorias." };
  }
  const independent = new Set(confirming.map((s) => registrableDomain(parseSourceUrl(s.url)!.hostname))).size;
  const hasPrimary = confirming.some((s) => s.type === "primaria" || s.type === "oficial");
  if (independent >= 2 || hasPrimary) {
    return { canPublish: true, verification: "confirmada", contradictory: false, invalid, note: hasPrimary ? "Confirmada por una fuente primaria u oficial." : "Confirmada por dos o más fuentes de medios distintos." };
  }
  const sameOutlet = confirming.length >= 2;
  return {
    canPublish: true, verification: "en_desarrollo", contradictory: false, invalid,
    note: sameOutlet
      ? "Las fuentes son del mismo medio (mismo dominio): no cuentan como independientes. Se publicará como “en desarrollo” y no podrá ser portada."
      : "Una sola fuente no primaria: se publicará como “en desarrollo” y no podrá ser portada.",
  };
}
