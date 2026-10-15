export type Scope = "local" | "nacional" | "regional" | "internacional";
export type Verification = "confirmada" | "en_desarrollo";
export type SourceType = "primaria" | "oficial" | "medio";
/**
 * propia: tomada por el equipo/medio. licencia_libre: con licencia y del hecho.
 * archivo: imagen ilustrativa con licencia que NO corresponde al hecho.
 * generada_ia / alterada_ia: contenido sintetico o modificado con IA.
 */
export type ImageOrigin = "propia" | "licencia_libre" | "archivo" | "generada_ia" | "alterada_ia";

export interface Source {
  name: string;
  url: string;
  type: SourceType;
  supports: "confirma" | "contradice";
}

export interface ArticleImage {
  url: string;
  origin: ImageOrigin;
  credit: string;
  /** Pagina original de la imagen (p. ej. la ficha en Flickr o Wikimedia). */
  sourceUrl?: string;
  /** Titulo de la obra y enlace a su licencia (atribucion Creative Commons completa). */
  title?: string;
  licenseUrl?: string;
  /** Solo imagenes generadas con IA: modelo y prompt usados, para transparencia. */
  model?: string;
  prompt?: string;
}

/** Lugar al que se refiere la noticia. Mientras mas campos, mas especifico. */
export interface Place {
  city?: string;
  department?: string;
  country?: string;
  region?: string;
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  /** Quien escribio el resumen: se muestra al lector. */
  summaryOrigin: "humano" | "ia";
  body: string;
  topics: string[];
  scope: Scope;
  places: Place[];
  sources: Source[];
  verification: Verification;
  image?: ArticleImage | null;
  publishedAt: number;
  authorUid?: string;
}

export interface SimLocation {
  id: string;
  label: string;
  city: string;
  department: string;
  country: string;
  region: string;
}

export type Affinity = Record<string, number>;

export interface ChatClaim {
  text: string;
  articleId: string;
  title: string;
  verification: Verification;
  /** Fuentes de la noticia citada, para que el lector vea la procedencia sin salir del chat. */
  sources: Pick<Source, "name" | "url" | "supports">[];
  /** La noticia citada tiene fuentes que se contradicen. */
  contradictory: boolean;
}

export interface ChatResponse {
  claims: ChatClaim[];
  /** ia = redactado por el modelo; extractivo = armado sin modelo; ninguno = sin resultados. */
  generatedBy: "ia" | "extractivo" | "ninguno";
  notice?: string;
}
