export type Scope = "local" | "nacional" | "regional" | "internacional";
export type Verification = "confirmada" | "en_desarrollo";
export type SourceType = "primaria" | "oficial" | "medio";
export type ImageOrigin = "propia" | "licencia_libre" | "generada_ia";

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
}

export interface ChatResponse {
  claims: ChatClaim[];
  /** ia = redactado por el modelo; extractivo = armado sin modelo; ninguno = sin resultados. */
  generatedBy: "ia" | "extractivo" | "ninguno";
  notice?: string;
}
