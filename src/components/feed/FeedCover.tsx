"use client";
import type { CSSProperties } from "react";
import { ScrollScene } from "@/components/motion";
import type { Ranked } from "@/lib/relevance";
import type { SimLocation } from "@/lib/types";

/** Letras que entran girando en 3D, una tras otra. El h1 conserva el texto accesible. */
function SplitWord({ text, from = 0, className }: { text: string; from?: number; className?: string }) {
  return (
    <span className={`feed-split ${className ?? ""}`} aria-hidden>
      {Array.from(text).map((ch, i) => (
        <span key={i} className="feed-char" style={{ "--ci": from + i } as CSSProperties}>{ch}</span>
      ))}
    </span>
  );
}

function dateline(): string {
  const s = new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Portada de la edicion: escena sticky. Al hacer scroll la cabecera retrocede en profundidad
 * y la pila de hojas (las tres primeras historias) se abre en 3D y se eleva hacia la historia principal.
 */
export function FeedCover({ ranked, location }: { ranked: Ranked[]; location: SimLocation }) {
  const top = ranked.slice(0, 3);
  return (
    <ScrollScene height="200vh" className="feed-cover" stageClassName="feed-cover-stage">
      <div className="feed-cover-glow" aria-hidden><i /><i /></div>
      <div className="feed-cover-inner">
        <div className="feed-cover-mast">
          <p className="feed-cover-dateline">
            <span>{dateline()}</span>
            <span className="feed-cover-sep" aria-hidden />
            <span><b className="feed-cover-brand">noti8</b> · Edición personal</span>
          </p>
          <h1 className="feed-cover-title" aria-label="Tu edición">
            <SplitWord text="Tu" />{" "}
            <SplitWord text="edición" from={3} className="feed-cover-em" />
          </h1>
          <p className="feed-cover-loc">
            Desde <strong>{location.city}</strong>, {location.country}
          </p>
          <p className="feed-cover-dek">
            {ranked.length} {ranked.length === 1 ? "historia ordenada" : "historias ordenadas"} por cercanía, actualidad, tus temas y alcance.
            Ninguna se oculta.
          </p>
        </div>

        <div className="feed-stack-wrap" aria-hidden>
          <div className="feed-stack">
            {top.map(({ article: a }, i) => (
              <div key={a.id} className="feed-sheet" style={{ "--i": i, "--n": top.length } as CSSProperties}>
                <span className="feed-sheet-kicker">{String(i + 1).padStart(2, "0")} · {a.topics[0] ?? "noticia"}</span>
                <span className="feed-sheet-title">{a.title}</span>
                <span className="feed-sheet-lines"><i /><i /><i /></span>
              </div>
            ))}
          </div>
        </div>

        <div className="feed-cover-cue" aria-hidden>
          <span>Desliza para empezar</span>
          <i />
        </div>
      </div>
    </ScrollScene>
  );
}
