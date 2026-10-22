"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { imageCaption, isAiImage } from "@/components/Badges";
import { Reveal, ScrollProgressBar, Tilt } from "@/components/motion";
import { ArticleHero } from "@/components/article/ArticleHero";
import { SourcesChapter } from "@/components/article/SourcesChapter";
import { hasContradiction, parseSourceUrl, registrableDomain } from "@/lib/validation";
import { useStore } from "@/lib/store";
import "@/styles/article.css";

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const { articles, ready, trackOpen } = useStore();
  const a = articles.find((x) => x.id === id);

  // Senal de comportamiento: una vez por apertura.
  useEffect(() => { if (a) trackOpen(a); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [a?.id]);

  if (!ready) return <main className="center article-state">Cargando…</main>;
  if (!a) return <main className="center article-state">No se encontró la noticia. <Link href="/feed">Volver</Link></main>;

  const contradictory = hasContradiction(a.sources);
  // Motivo para el lector cuando no hay contradiccion: una sola fuente, o varias del mismo medio.
  const outlets = new Set(a.sources.map((s) => { const u = parseSourceUrl(s.url); return u ? registrableDomain(u.hostname) : s.url; }));
  const pendingReason = a.sources.length > 1 && outlets.size === 1
    ? "Las fuentes son del mismo medio y aún no hay confirmación independiente."
    : "Solo hay una fuente y aún no está confirmada de forma independiente.";
  const caption = imageCaption(a);
  const paragraphs = a.body.split(/\n+/).filter((p) => p.trim());
  const readMin = Math.max(1, Math.round(a.body.split(/\s+/).filter(Boolean).length / 200));

  return (
    <main className="article">
      <ScrollProgressBar />
      <ArticleHero a={a} readMin={readMin} />

      <div className="a-col">
        {caption && a.image && (
          <Reveal variant="fade" className="a-credit">
            {caption}
            {a.image.licenseUrl && parseSourceUrl(a.image.licenseUrl) && <> · <a href={a.image.licenseUrl} target="_blank" rel="noopener noreferrer license">licencia</a></>}
            {a.image.sourceUrl && parseSourceUrl(a.image.sourceUrl) && <> · <a href={a.image.sourceUrl} target="_blank" rel="noopener noreferrer">ver original</a></>}
            {isAiImage(a.image.origin) && (a.image.model || a.image.prompt) && (
              <details>
                <summary>¿Cómo se generó?</summary>
                {a.image.model && <p>Modelo: {a.image.model}</p>}
                {a.image.prompt && <p>Descripción usada: “{a.image.prompt}”</p>}
                <p>Es una ilustración: no documenta lo ocurrido.</p>
              </details>
            )}
          </Reveal>
        )}

        {a.verification === "en_desarrollo" && (
          <Reveal variant="flip" className="callout warn a-devel">
            <b>Noticia en desarrollo.</b>{" "}
            {contradictory ? "Las fuentes disponibles se contradicen; abajo están las que confirman y las que contradicen." : pendingReason}{" "}
            Puede cambiar.
          </Reveal>
        )}

        <section className="a-section summary" aria-labelledby="a-sum-h">
          <Reveal variant="blur">
            <span className="a-kicker">01 · Lo esencial</span>
            <h2 id="a-sum-h" className="a-h2">En 30 segundos</h2>
          </Reveal>
          <Reveal variant="rise3d" delay={90} className="a-sum-wrap">
            <Tilt max={5} className="a-sum-tilt">
              <span className="a-sum-glow" aria-hidden />
              <div className="a-sum">
                <div className="gen">{a.summaryOrigin === "ia" ? "Resumen generado por IA y revisado por el editor" : "Resumen escrito por el editor"}</div>
                <p>{a.summary}</p>
              </div>
            </Tilt>
          </Reveal>
        </section>

        <section className="a-section text a-body" aria-labelledby="a-body-h">
          <Reveal variant="blur">
            <span className="a-kicker">02 · La noticia</span>
            <h2 id="a-body-h" className="a-h2">Texto completo</h2>
            <div className="gen">Texto original del editor</div>
          </Reveal>
          {paragraphs.map((p, i) => (
            <Reveal key={i} as="p" variant={i % 2 ? "up" : "blur"} className="a-p">{p}</Reveal>
          ))}
        </section>

        <SourcesChapter sources={a.sources} verification={a.verification} />

        <footer className="a-end">
          <Reveal variant="zoom">
            <div className="a-end-mark" aria-hidden>◆</div>
            <span className="a-kicker">Fin del artículo</span>
            <h2 className="a-h2">Sigue informándote</h2>
            <div className="a-end-actions">
              <Link href="/feed" className="btn primary">← Más noticias</Link>
              <button type="button" className="btn" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↑ Volver arriba</button>
            </div>
          </Reveal>
        </footer>
      </div>
    </main>
  );
}
