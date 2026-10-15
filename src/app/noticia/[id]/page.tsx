"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { ArticleImage, VerificationBadge, imageCaption, isAiImage, timeAgo } from "@/components/Badges";
import { hasContradiction, parseSourceUrl, registrableDomain } from "@/lib/validation";
import { useStore } from "@/lib/store";

const TYPE = { primaria: "Fuente primaria", oficial: "Fuente oficial", medio: "Medio" } as const;

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const { articles, ready, trackOpen } = useStore();
  const a = articles.find((x) => x.id === id);

  // Senal de comportamiento: una vez por apertura.
  useEffect(() => { if (a) trackOpen(a); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [a?.id]);

  if (!ready) return <main className="center">Cargando…</main>;
  if (!a) return <main className="center">No se encontró la noticia. <Link href="/feed">Volver</Link></main>;

  const contradictory = hasContradiction(a.sources);
  // Motivo para el lector cuando no hay contradiccion: una sola fuente, o varias del mismo medio.
  const outlets = new Set(a.sources.map((s) => { const u = parseSourceUrl(s.url); return u ? registrableDomain(u.hostname) : s.url; }));
  const pendingReason = a.sources.length > 1 && outlets.size === 1
    ? "Las fuentes son del mismo medio y aún no hay confirmación independiente."
    : "Solo hay una fuente y aún no está confirmada de forma independiente.";
  const caption = imageCaption(a);

  return (
    <main className="article">
      <Link href="/feed" className="back">← Noticias</Link>
      <div className="meta"><VerificationBadge v={a.verification} /><span>{timeAgo(a.publishedAt)}</span><span>{a.topics.join(" · ")}</span></div>
      <h1>{a.title}</h1>

      {a.verification === "en_desarrollo" && (
        <div className="callout warn">
          <b>Noticia en desarrollo.</b>{" "}
          {contradictory ? "Las fuentes disponibles se contradicen; abajo están las que confirman y las que contradicen." : pendingReason}{" "}
          Puede cambiar.
        </div>
      )}

      {a.image?.url && (
        <figure>
          <ArticleImage a={a} />
          {caption && (
            <figcaption>
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
            </figcaption>
          )}
        </figure>
      )}

      <section className="summary">
        <div className="gen">{a.summaryOrigin === "ia" ? "Resumen generado por IA y revisado por el editor" : "Resumen escrito por el editor"}</div>
        <p>{a.summary}</p>
      </section>

      <section className="text">
        <div className="gen">Texto original del editor</div>
        {a.body.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}
      </section>

      <section className="sources">
        <h2>Fuentes</h2>
        <ul>
          {a.sources.map((s, i) => (
            <li key={i}>
              {parseSourceUrl(s.url) ? <a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a> : <b>{s.name}</b>}
              <span>{TYPE[s.type]} · {s.supports === "confirma" ? "confirma" : "contradice"}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
