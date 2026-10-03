"use client";
import Link from "next/link";
import { useMemo } from "react";
import { ArticleImage, VerificationBadge, timeAgo } from "@/components/Badges";
import { rankFeed } from "@/lib/relevance";
import { useStore } from "@/lib/store";

export default function FeedPage() {
  const { articles, location, affinity, ready } = useStore();
  const ranked = useMemo(() => rankFeed(articles, location, affinity), [articles, location, affinity]);

  if (!ready) return <main className="center">Cargando noticias…</main>;
  if (ranked.length === 0) return <main className="center">Aún no hay noticias publicadas.</main>;

  return (
    <main className="feed">
      {ranked.map(({ article: a, tier, reason, reserved }) => (
        <Link key={a.id} href={`/noticia/${a.id}`} className={`card ${tier}`}>
          {tier !== "compact" && <ArticleImage a={a} />}
          <div className="body">
            <div className={`why ${reserved ? "reserved" : ""}`}>{reason}</div>
            <h2>{a.title}</h2>
            {tier !== "compact" && <p>{a.summary}</p>}
            <div className="meta">
              <VerificationBadge v={a.verification} />
              <span>{a.sources[0]?.name ?? "Sin fuente"}{a.sources.length > 1 ? ` +${a.sources.length - 1}` : ""}</span>
              <span>{timeAgo(a.publishedAt)}</span>
            </div>
          </div>
        </Link>
      ))}
      <p className="foot">Orden calculado por cercanía, actualidad, tus temas y alcance. Ninguna noticia se oculta; solo cambia su posición y tamaño.</p>
    </main>
  );
}
