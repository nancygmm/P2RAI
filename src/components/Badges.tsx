import type { Article, ImageOrigin, Verification } from "@/lib/types";

export function VerificationBadge({ v }: { v: Verification }) {
  return v === "confirmada"
    ? <span className="badge ok">✓ Confirmado</span>
    : <span className="badge warn">◐ En desarrollo</span>;
}

export const ORIGIN: Record<ImageOrigin, string> = {
  propia: "Imagen propia",
  licencia_libre: "Imagen con licencia libre",
  archivo: "Imagen de archivo · no corresponde al hecho",
  generada_ia: "Ilustración generada con IA",
  alterada_ia: "Imagen alterada con IA",
};

/** Sello que va SOBRE la imagen y no se puede quitar: lo sintetico o ilustrativo nunca parece evidencia. */
const STAMP: Partial<Record<ImageOrigin, { text: string; className: string }>> = {
  generada_ia: { text: "Ilustración generada con IA · no es una foto del hecho", className: "ai-stamp" },
  alterada_ia: { text: "Imagen alterada con IA · no es evidencia del hecho", className: "ai-stamp" },
  archivo: { text: "Imagen de archivo · ilustrativa", className: "ai-stamp archive" },
};

/** Sello de origen para una imagen (o null si es una foto propia o del hecho). */
export function ImageStamp({ origin }: { origin: ImageOrigin }) {
  const stamp = STAMP[origin];
  return stamp ? <span className={stamp.className}>{stamp.text}</span> : null;
}

export function isAiImage(origin: ImageOrigin): boolean {
  return origin === "generada_ia" || origin === "alterada_ia";
}

/** Imagen de la noticia, con su sello de origen cuando no es una foto del hecho. */
export function ArticleImage({ a, className }: { a: Article; className?: string }) {
  if (!a.image?.url) return <div className={`img placeholder ${className ?? ""}`} aria-hidden>{a.topics[0] ?? "noticia"}</div>;
  return (
    <div className={`img ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={a.image.url} alt={`${ORIGIN[a.image.origin]}: ${a.title}`} loading="lazy" />
      <ImageStamp origin={a.image.origin} />
    </div>
  );
}

export function imageCaption(a: Article): string | null {
  if (!a.image?.url) return null;
  return `${ORIGIN[a.image.origin]}${a.image.credit ? ` · ${a.image.credit}` : ""}`;
}

export function timeAgo(ts: number): string {
  const h = Math.round((Date.now() - ts) / 3_600_000);
  if (h < 1) return "hace minutos";
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}
