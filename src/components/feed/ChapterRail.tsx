"use client";
import { useEffect, useRef, useState } from "react";
import { useScrollProgress } from "@/components/motion";

export type Chapter = { id: string; num: string; title: string };

/**
 * Indicador de capitulos: pastilla de vidrio pegada abajo (sticky) que muestra el capitulo
 * actual y el avance de la edicion. Se oculta mientras se ve la portada.
 */
export function ChapterRail({ chapters }: { chapters: Chapter[] }) {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState<string | null>(null);
  useScrollProgress(ref, "page");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) seen.set(e.target.id, e.isIntersecting);
      const current = chapters.find((c) => seen.get(c.id));
      // Si ninguno cruza la linea central, nos quedamos con el ultimo que paso por encima.
      if (current) setActive(current.id);
      else {
        const passed = chapters.filter((c) => {
          const el = document.getElementById(c.id);
          return el && el.getBoundingClientRect().top < window.innerHeight / 2;
        });
        setActive(passed.length ? passed[passed.length - 1].id : null);
      }
    }, { rootMargin: "-45% 0px -50% 0px" });
    chapters.forEach((c) => { const el = document.getElementById(c.id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [chapters]);

  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const current = chapters.find((c) => c.id === active);

  return (
    <nav ref={ref} className={`feed-rail${current ? " is-on" : ""}`} aria-label="Capítulos de la edición">
      <div className="feed-rail-pill">
        {chapters.map((c) => (
          <button
            key={c.id}
            type="button"
            className={c.id === active ? "is-active" : undefined}
            aria-current={c.id === active ? "true" : undefined}
            onClick={() => go(c.id)}
          >
            <span className="feed-rail-num">{c.num}</span>
            <span className="feed-rail-label">{c.title}</span>
          </button>
        ))}
        <i className="feed-rail-bar" aria-hidden />
      </div>
    </nav>
  );
}
