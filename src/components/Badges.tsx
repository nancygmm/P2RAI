import type { Article, ImageOrigin, Verification } from "@/lib/types";
import { GenerativeCover } from "./media/Cover";
import { FadeImg } from "./media/FadeImg";
import "@/styles/media.css";

export function VerificationBadge({ v }: { v: Verification }) {
  return v === "confirmada"
    ? (
      <span className="badge ok media-badge">
        <svg className="media-badge-ic" viewBox="0 0 16 16" aria-hidden focusable="false">
          <circle cx="8" cy="8" r="8" fill="currentColor" />
          <path d="M4.6 8.3 7 10.6l4.5-5" fill="none" stroke="var(--media-on)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Confirmado
      </span>
    )
    : (
      <span className="badge warn media-badge">
        <span className="media-pulse" aria-hidden />
        En desarrollo
      </span>
    );
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
  if (!stamp) return null;
  const archive = origin === "archivo";
  return (
    <span className={stamp.className}>
      <svg className="ai-stamp-ic" viewBox="0 0 20 20" aria-hidden focusable="false">
        {archive ? (
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="14" height="4" rx="1" /><path d="M4.5 8v7a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V8M8 11.5h4" />
          </g>
        ) : (
          <g fill="currentColor">
            <path d="M8 3l1.5 4.2L13.7 8.7 9.5 10.2 8 14.4 6.5 10.2 2.3 8.7l4.2-1.5z" />
            <path d="M15 11l.8 2.2L18 14l-2.2.8L15 17l-.8-2.2L12 14l2.2-.8z" />
          </g>
        )}
      </svg>
      <span className="ai-stamp-tx">{stamp.text}</span>
    </span>
  );
}

export function isAiImage(origin: ImageOrigin): boolean {
  return origin === "generada_ia" || origin === "alterada_ia";
}

/** Imagen de la noticia, con su sello de origen cuando no es una foto del hecho. */
export function ArticleImage({ a, className }: { a: Article; className?: string }) {
  if (!a.image?.url) return <GenerativeCover id={a.id} topic={a.topics[0]} className={className} />;
  return (
    <div className={`img ${className ?? ""}`}>
      <FadeImg src={a.image.url} alt={`${ORIGIN[a.image.origin]}: ${a.title}`} />
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
