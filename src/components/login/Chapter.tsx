"use client";
import { useRef, type ReactNode } from "react";
import { Reveal, useScrollProgress } from "../motion";

/** Capitulo del landing: numero gigante, texto que aparece y un visual 3D que se mueve con --p. */
export function Chapter({ n, kicker, title, visual, flip, children }: {
  n: string; kicker: string; title: ReactNode; visual: ReactNode; flip?: boolean; children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useScrollProgress(ref, "through");
  return (
    <section ref={ref} className={`login-ch${flip ? " is-flip" : ""}`}>
      <span className="login-ch-num" aria-hidden="true">{n}</span>
      <Reveal variant="rise3d" className="login-ch-visual" aria-hidden="true">{visual}</Reveal>
      <div className="login-ch-text">
        <Reveal as="p" variant="up" className="login-kicker">{n} — {kicker}</Reveal>
        <Reveal as="h2" variant="blur" delay={90}>{title}</Reveal>
        <Reveal variant="up" delay={180} className="login-ch-body">{children}</Reveal>
      </div>
    </section>
  );
}
