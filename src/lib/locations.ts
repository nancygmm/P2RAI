import type { SimLocation } from "./types";

/** Ubicaciones simuladas. La personalizacion usa esto, nunca el GPS. */
export const LOCATIONS: SimLocation[] = [
  { id: "gt-guatemala", label: "Ciudad de Guatemala", city: "Ciudad de Guatemala", department: "Guatemala", country: "Guatemala", region: "Centroamérica" },
  { id: "gt-antigua", label: "Antigua Guatemala", city: "Antigua Guatemala", department: "Sacatepéquez", country: "Guatemala", region: "Centroamérica" },
  { id: "gt-xela", label: "Quetzaltenango", city: "Quetzaltenango", department: "Quetzaltenango", country: "Guatemala", region: "Centroamérica" },
  { id: "gt-coban", label: "Cobán", city: "Cobán", department: "Alta Verapaz", country: "Guatemala", region: "Centroamérica" },
  { id: "sv-sansalvador", label: "San Salvador", city: "San Salvador", department: "San Salvador", country: "El Salvador", region: "Centroamérica" },
  { id: "mx-cdmx", label: "Ciudad de México", city: "Ciudad de México", department: "Ciudad de México", country: "México", region: "Norteamérica" },
  { id: "co-bogota", label: "Bogotá", city: "Bogotá", department: "Cundinamarca", country: "Colombia", region: "Sudamérica" },
  { id: "es-madrid", label: "Madrid", city: "Madrid", department: "Comunidad de Madrid", country: "España", region: "Europa" },
];

export const DEFAULT_LOCATION_ID = "gt-guatemala";

export function getLocation(id?: string | null): SimLocation {
  return LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[0];
}

export const TOPICS = [
  "política", "economía", "seguridad", "salud", "educación", "deportes",
  "tecnología", "clima", "cultura", "transporte", "ciencia",
];
