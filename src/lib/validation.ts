import type { Source, Verification } from "./types";

export interface ValidationResult {
  canPublish: boolean;
  verification: Verification | null;
  note: string;
  contradictory: boolean;
}

function host(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url.trim().toLowerCase(); }
}

/**
 * Regla de validacion del portal. La decide el codigo a partir de las fuentes
 * registradas por una persona; ningun modelo de IA participa en este veredicto.
 */
export function validateSources(sources: Source[]): ValidationResult {
  const valid = sources.filter((s) => s.name.trim() && s.url.trim());
  if (valid.length === 0) {
    return { canPublish: false, verification: null, contradictory: false, note: "Agrega al menos una fuente con nombre y enlace para poder publicar." };
  }
  const confirming = valid.filter((s) => s.supports === "confirma");
  const contradictory = valid.some((s) => s.supports === "contradice");
  if (contradictory) {
    return { canPublish: true, verification: "en_desarrollo", contradictory: true, note: "Hay fuentes que se contradicen: se publicará como “en desarrollo” con la nota de versiones contradictorias." };
  }
  const independent = new Set(confirming.map((s) => host(s.url))).size;
  const hasPrimary = confirming.some((s) => s.type === "primaria" || s.type === "oficial");
  if (independent >= 2 || hasPrimary) {
    return { canPublish: true, verification: "confirmada", contradictory: false, note: hasPrimary ? "Confirmada por una fuente primaria u oficial." : "Confirmada por dos o más fuentes independientes." };
  }
  return { canPublish: true, verification: "en_desarrollo", contradictory: false, note: "Una sola fuente no primaria: se publicará como “en desarrollo” y no podrá ser portada." };
}
