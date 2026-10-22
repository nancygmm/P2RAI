"use client";
import Link from "next/link";
import { useRef } from "react";
import { ArticleImage, VerificationBadge, timeAgo } from "@/components/Badges";
import { Reveal, Tilt, stagger, useScrollProgress } from "@/components/motion";
import type { Ranked } from "@/lib/relevance";
import type { Article } from "@/lib/types";

export type RankedItem = Ranked & { rank: number };

const pad = (n: number) => String(n).padStart(2, "0");

/** Motivo de la posicion. Los cupos reservados (anti-burbuja) se distinguen visualmente. */
export function WhyLabel({ reason, reserved }: { reason: string; reserved: boolean }) {
  return (
    <div className={`feed-why${reserved ? " is-reserved" : ""}`}>
      <span className="feed-why-mark" aria-hidden>{reserved ? "◆" : ""}</span>
      <span>{reason}</span>
    </div>
  );
}

function Summary({ a, className }: { a: Article; className?: string }) {
  return (
    <p className={`feed-summary ${className ?? ""}`}>
      {a.summaryOrigin === "ia" && <span className="tag">Resumen IA</span>}
      {a.summary}
    </p>
  );
}

function Meta({ a }: { a: Article }) {
  return (
    <div className="feed-meta">
      <VerificationBadge v={a.verification} />
      <span className="feed-meta-src">{a.sources[0]?.name ?? "Sin fuente"}{a.sources.length > 1 ? ` +${a.sources.length - 1}` : ""}</span>
      <span className="feed-meta-time">{timeAgo(a.publishedAt)}</span>
    </div>
  );
}

/**
 * Historia principal: se levanta desde la perspectiva (rotateX + escala) a medida que entra,
 * ligada al scroll. Inclinacion 3D con el puntero en escritorio.
 */
export function HeroStory({ item }: { item: RankedItem }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollProgress(ref, "through");
  const { article: a, reason, reserved, rank } = item;
  return (
    <div ref={ref} className="feed-hero-stage">
      <div className="feed-hero-3d">
        <Tilt max={5} className="feed-hero-tilt">
          <Link href={`/noticia/${a.id}`} className="feed-card feed-hero">
            <div className="feed-card-media">
              <ArticleImage a={a} />
              <span className="feed-rank">N.º {rank}</span>
            </div>
            <div className="feed-card-body">
              <WhyLabel reason={reason} reserved={reserved} />
              <h2 className="feed-hero-title">{a.title}</h2>
              <Summary a={a} />
              <Meta a={a} />
              <span className="feed-hero-cta">Leer la historia <span aria-hidden>→</span></span>
            </div>
          </Link>
        </Tilt>
      </div>
    </div>
  );
}

/** Tarjeta mediana: aparece con un giro 3D (las parejas se abren como un libro). */
export function MediumCard({ item, wide, col, order }: { item: RankedItem; wide: boolean; col: 0 | 1; order: number }) {
  const { article: a, reason, reserved, rank } = item;
  return (
    <Reveal
      variant={wide ? "rise3d" : "flip"}
      delay={stagger(order % 2, 110)}
      className={`feed-mcell${wide ? " is-wide" : ""}${!wide && col === 1 ? " is-right" : ""}`}
    >
      <Tilt max={7} className="feed-mtilt">
        <Link href={`/noticia/${a.id}`} className={`feed-card feed-mcard${wide ? " is-wide" : ""}`}>
          <div className="feed-card-media">
            <ArticleImage a={a} />
            <span className="feed-rank">#{rank}</span>
          </div>
          <div className="feed-card-body">
            <WhyLabel reason={reason} reserved={reserved} />
            <h2 className="feed-mcard-title">{a.title}</h2>
            {wide && <Summary a={a} className="is-clamped" />}
            <Meta a={a} />
          </div>
        </Link>
      </Tilt>
    </Reveal>
  );
}

/** Linea de la lista numerada: entra de lado, linea por linea, y dibuja su filete. */
export function CompactRow({ item, order }: { item: RankedItem; order: number }) {
  const { article: a, reason, reserved, rank } = item;
  return (
    <Reveal as="li" variant="left" delay={stagger(order % 4, 80)} className="feed-row-wrap">
      <Link href={`/noticia/${a.id}`} className="feed-row">
        <span className="feed-row-num" aria-label={`Posición ${rank}`}>{pad(rank)}</span>
        <div className="feed-row-body">
          <WhyLabel reason={reason} reserved={reserved} />
          <h3 className="feed-row-title">{a.title}</h3>
          <Meta a={a} />
        </div>
        <span className="feed-row-arrow" aria-hidden>→</span>
      </Link>
    </Reveal>
  );
}

/**
 * Pinta un tramo del ranking respetando el orden exacto: las medianas consecutivas van en
 * rejilla de dos (la ultima impar ocupa todo el ancho) y las compactas como lista numerada.
 */
export function RankedRun({ items }: { items: RankedItem[] }) {
  const blocks: { kind: "medium" | "compact"; items: RankedItem[] }[] = [];
  for (const it of items) {
    const kind = it.tier === "compact" ? "compact" : "medium";
    const last = blocks[blocks.length - 1];
    if (last && last.kind === kind) last.items.push(it);
    else blocks.push({ kind, items: [it] });
  }
  return (
    <>
      {blocks.map((b) =>
        b.kind === "medium" ? (
          <div key={`m${b.items[0].rank}`} className="feed-grid">
            {b.items.map((it, j) => (
              <MediumCard
                key={it.article.id}
                item={it}
                order={j}
                col={(j % 2) as 0 | 1}
                wide={b.items.length % 2 === 1 && j === b.items.length - 1}
              />
            ))}
          </div>
        ) : (
          <ol key={`c${b.items[0].rank}`} className="feed-list">
            {b.items.map((it, j) => <CompactRow key={it.article.id} item={it} order={j} />)}
          </ol>
        ),
      )}
    </>
  );
}
