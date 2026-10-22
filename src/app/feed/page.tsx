"use client";
import { useMemo, type CSSProperties } from "react";
import { Reveal, Parallax } from "@/components/motion";
import { ChapterRail, type Chapter } from "@/components/feed/ChapterRail";
import { FeedCover } from "@/components/feed/FeedCover";
import { HeroStory, MediumCard, RankedRun, type RankedItem } from "@/components/feed/FeedCards";
import { TOP_N, WEIGHTS, rankFeed } from "@/lib/relevance";
import { useStore } from "@/lib/store";
import "@/styles/feed.css";

type ChapterDef = Chapter & { dek: string; items: RankedItem[] };

const FACTORS: { key: keyof typeof WEIGHTS; label: string }[] = [
  { key: "geo", label: "Cercanía" },
  { key: "recency", label: "Actualidad" },
  { key: "interest", label: "Tus temas" },
  { key: "reach", label: "Alcance" },
];

function FeedSkeleton() {
  return (
    <main className="feed feed--loading" aria-busy="true">
      <div className="feed-skel-mast">
        <div className="skeleton feed-skel-line" style={{ width: "46%" }} />
        <div className="skeleton feed-skel-title" />
        <div className="skeleton feed-skel-line" style={{ width: "62%" }} />
      </div>
      <div className="skeleton feed-skel-hero" />
      <div className="feed-skel-grid">
        <div className="skeleton feed-skel-card" />
        <div className="skeleton feed-skel-card" />
      </div>
      <p className="feed-skel-hint" role="status">Cargando noticias…</p>
    </main>
  );
}

function ChapterHead({ c }: { c: ChapterDef }) {
  return (
    <header className="feed-chapter-head">
      <Parallax speed={-0.12} className="feed-chapter-ghost">
        <span aria-hidden>{c.num}</span>
      </Parallax>
      <Reveal as="h2" id={`${c.id}-t`} variant="up" className="feed-kicker">{c.num} — {c.title}</Reveal>
      <Reveal variant="blur" delay={120} as="p" className="feed-chapter-dek">{c.dek}</Reveal>
    </header>
  );
}

export default function FeedPage() {
  const { articles, location, affinity, ready } = useStore();
  const ranked = useMemo(() => rankFeed(articles, location, affinity), [articles, location, affinity]);

  // Capitulos por posicion (no por tamano): asi el orden del ranking se respeta tal cual.
  const chapters = useMemo<ChapterDef[]>(() => {
    const items: RankedItem[] = ranked.map((r, i) => ({ ...r, rank: i + 1 }));
    const zone = Math.min(TOP_N, items.length);
    const defs = [
      { id: "feed-ch-1", title: "Lo más relevante para ti", dek: "La historia que encabeza tu edición.", items: items.slice(0, 1) },
      { id: "feed-ch-2", title: "También importante", dek: "Lo que sigue en relevancia, con cupos para lo local, lo nacional y lo internacional.", items: items.slice(1, zone) },
      { id: "feed-ch-3", title: "Más noticias", dek: "El resto de la edición, en orden. Nada queda fuera.", items: items.slice(zone) },
    ].filter((d) => d.items.length > 0);
    return defs.map((d, i) => ({ ...d, num: String(i + 1).padStart(2, "0") }));
  }, [ranked]);
  const railChapters = useMemo<Chapter[]>(() => chapters.map(({ id, num, title }) => ({ id, num, title })), [chapters]);

  if (!ready) return <FeedSkeleton />;
  if (ranked.length === 0) {
    return (
      <main className="feed feed--empty">
        <div className="feed-empty">
          <span className="feed-empty-mark" aria-hidden>¶</span>
          <p>Aún no hay noticias publicadas.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="feed">
      <FeedCover ranked={ranked} location={location} />

      {chapters.map((c, ci) => (
        <section key={c.id} id={c.id} className={`feed-chapter feed-chapter--${ci + 1}`} aria-labelledby={`${c.id}-t`}>
          <ChapterHead c={c} />
          {ci === 0 ? (
            c.items[0].tier === "hero"
              ? <HeroStory item={c.items[0]} />
              : <div className="feed-grid"><MediumCard item={c.items[0]} wide col={0} order={0} /></div>
          ) : (
            <RankedRun items={c.items} />
          )}
        </section>
      ))}

      <ChapterRail chapters={railChapters} />

      <footer className="feed-end">
        <Reveal variant="zoom" className="feed-end-mark">
          <span aria-hidden>✦</span> Fin de la edición <span aria-hidden>✦</span>
        </Reveal>
        <Reveal variant="tilt" className="feed-end-card">
          <p className="feed-end-title">Cómo se ordenó tu edición</p>
          <ul className="feed-end-weights">
            {FACTORS.map((f, i) => (
              <li key={f.key} style={{ "--w": WEIGHTS[f.key] / 0.4, "--d": `${i * 90}ms` } as CSSProperties}>
                <span>{f.label}</span>
                <b>{Math.round(WEIGHTS[f.key] * 100)} %</b>
                <i aria-hidden><i /></i>
              </li>
            ))}
          </ul>
          <p className="feed-foot">Orden calculado por cercanía, actualidad, tus temas y alcance. Ninguna noticia se oculta; solo cambia su posición y tamaño.</p>
          <p className="feed-end-note">Entre las primeras {TOP_N} siempre hay al menos una noticia local, una nacional y una internacional (si existen). Las que suben por ese cupo se marcan con ◆.</p>
        </Reveal>
      </footer>
    </main>
  );
}
