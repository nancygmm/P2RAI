"use client";
import Link from "next/link";
import { ArticleImage, VerificationBadge, timeAgo } from "@/components/Badges";
import { ScrollScene } from "@/components/motion";
import type { Article } from "@/lib/types";

/**
 * Portada cinematografica: cover a pantalla completa que se aleja (zoom-out) mientras el titulo
 * se inclina hacia atras en 3D y se desvanece. La escena escribe --p (0..1) y todo se resuelve en CSS.
 */
export function ArticleHero({ a, readMin }: { a: Article; readMin: number }) {
  return (
    <ScrollScene height="170vh" className="a-hero" stageClassName="a-hero-stage">
      <div className="a-hero-media"><ArticleImage a={a} /></div>
      <div className="a-hero-scrim" aria-hidden />
      <div className="a-hero-ui">
        <Link href="/feed" className="back a-back">← Noticias</Link>
        <div className="a-hero-copy">
          <span className="a-kicker a-in" style={{ ["--d" as string]: "80ms" }}>Lectura · {readMin} min</span>
          <h1 className="a-in" style={{ ["--d" as string]: "180ms" }}>{a.title}</h1>
          <div className="meta a-in" style={{ ["--d" as string]: "320ms" }}>
            <VerificationBadge v={a.verification} />
            <span className="a-chip">{timeAgo(a.publishedAt)}</span>
            {a.topics.length > 0 && <span className="a-chip">{a.topics.join(" · ")}</span>}
          </div>
        </div>
        <div className="a-hint" aria-hidden>Desliza<i /></div>
      </div>
    </ScrollScene>
  );
}
