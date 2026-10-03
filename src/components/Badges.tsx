import type { Article, Verification } from "@/lib/types";

export function VerificationBadge({ v }: { v: Verification }) {
  return v === "confirmada"
    ? <span className="badge ok">✓ Confirmado</span>
    : <span className="badge warn">◐ En desarrollo</span>;
}

const ORIGIN: Record<string, string> = { propia: "Imagen propia", licencia_libre: "Licencia libre", generada_ia: "Ilustración generada con IA" };

/** Imagen de la noticia. Si fue generada con IA, la insignia va SOBRE la imagen y no se puede quitar. */
export function ArticleImage({ a, className }: { a: Article; className?: string }) {
  if (!a.image?.url) return <div className={`img placeholder ${className ?? ""}`} aria-hidden>{a.topics[0] ?? "noticia"}</div>;
  return (
    <div className={`img ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={a.image.url} alt="" loading="lazy" />
      {a.image.origin === "generada_ia" && <span className="ai-stamp">Ilustración generada con IA · no es una foto del hecho</span>}
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
