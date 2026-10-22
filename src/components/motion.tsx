"use client";
/**
 * Primitivas de movimiento compartidas (scroll tipo "story" y 3D).
 * Sin dependencias: IntersectionObserver + un solo bucle rAF para todo el scroll.
 * Todas respetan prefers-reduced-motion.
 *
 * API:
 *  - <Reveal variant="up|fade|tilt|flip|zoom|left|right|blur|rise3d" delay={ms}> aparece al entrar en pantalla.
 *  - stagger(i, step?, max?) -> ms de retraso para listas.
 *  - <ScrollScene height="300vh"> seccion alta con un hijo sticky; escribe --p (0..1) en la seccion.
 *  - useScrollProgress(ref, mode) escribe --p (0..1) en ref.current sin re-render.
 *  - <Parallax speed={0.2}> desplaza su contenido segun el scroll.
 *  - <Tilt max={10}> inclinacion 3D con el puntero (escribe --rx --ry --mx --my).
 *  - <ScrollProgressBar /> barra fija de progreso de lectura.
 *  - useReducedMotion(), useInView(ref, opts).
 */
import {
  createElement, useEffect, useLayoutEffect, useRef, useState,
  type CSSProperties, type ElementType, type HTMLAttributes, type ReactNode, type RefObject,
} from "react";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/* ---------- Bucle de scroll compartido ---------- */
type Tick = () => void;
const ticks = new Set<Tick>();
let frame = 0;
function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(() => { frame = 0; ticks.forEach((t) => t()); });
}
function subscribe(t: Tick): () => void {
  if (ticks.size === 0) {
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
  }
  ticks.add(t);
  t();
  return () => {
    ticks.delete(t);
    if (ticks.size === 0) {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    }
  };
}

const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));

/* ---------- Preferencias ---------- */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/* ---------- Visibilidad ---------- */
export function useInView<T extends Element>(
  ref: RefObject<T | null>,
  { once = true, threshold = 0.15, rootMargin = "0px 0px -8% 0px" }: { once?: boolean; threshold?: number; rootMargin?: string } = {},
): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); if (once) io.disconnect(); }
      else if (!once) setInView(false);
    }, { threshold, rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, once, threshold, rootMargin]);
  return inView;
}

export type RevealVariant = "up" | "fade" | "tilt" | "flip" | "zoom" | "left" | "right" | "blur" | "rise3d";

type RevealProps = {
  as?: ElementType;
  variant?: RevealVariant;
  /** Retraso en ms antes de animar. */
  delay?: number;
  once?: boolean;
  threshold?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "className" | "style" | "children">;

/** Aparece con una transicion (2D o 3D) cuando entra en pantalla. Estilos en globals.css ([data-reveal]). */
export function Reveal({ as = "div", variant = "up", delay = 0, once = true, threshold, className, style, children, ...rest }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once, threshold });
  return createElement(as, {
    ...rest,
    ref,
    "data-reveal": variant,
    className: `${className ?? ""}${inView ? " is-in" : ""}`.trim() || undefined,
    style: delay ? { ...style, ["--reveal-delay" as string]: `${delay}ms` } : style,
  }, children);
}

/** Retraso escalonado para listas: stagger(i) -> 0, 70, 140... con tope. */
export const stagger = (i: number, step = 70, max = 420) => Math.min(i * step, max);

/* ---------- Progreso de scroll ---------- */
/**
 * "through": 0 cuando el borde superior del elemento entra por abajo, 1 cuando su borde inferior sale por arriba.
 * "sticky":  para una seccion alta con hijo sticky: 0 al empezar a fijarse, 1 al soltarse.
 * "page":    progreso de toda la pagina.
 * Escribe --p en el elemento (y llama onProgress si se pasa). No provoca renders.
 */
export function useScrollProgress<T extends HTMLElement>(
  ref: RefObject<T | null>,
  mode: "through" | "sticky" | "page" = "through",
  onProgress?: (p: number) => void,
) {
  const cb = useRef(onProgress);
  cb.current = onProgress;
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let last = -1;
    return subscribe(() => {
      const vh = window.innerHeight;
      let p: number;
      if (mode === "page") {
        const max = document.documentElement.scrollHeight - vh;
        p = max > 0 ? window.scrollY / max : 0;
      } else {
        const r = el.getBoundingClientRect();
        p = mode === "sticky"
          ? (r.height - vh > 0 ? -r.top / (r.height - vh) : (r.top < 0 ? 1 : 0))
          : (vh - r.top) / (vh + r.height);
      }
      p = clamp(p);
      if (Math.abs(p - last) < 0.0005) return;
      last = p;
      el.style.setProperty("--p", p.toFixed(4));
      cb.current?.(p);
    });
  }, [ref, mode]);
}

/**
 * Escena de story: seccion de `height` (p. ej. "300vh") con un contenedor sticky de 100dvh.
 * La seccion recibe --p (0..1) segun el avance; los hijos lo usan en CSS con calc(var(--p) * ...).
 * Clases: .scene (seccion) y .scene-stage (sticky). Estilos base en globals.css.
 */
export function ScrollScene({ height = "300vh", className, stageClassName, children, onProgress, style }: {
  height?: string; className?: string; stageClassName?: string; children?: ReactNode;
  onProgress?: (p: number) => void; style?: CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  useScrollProgress(ref, "sticky", onProgress);
  return (
    <section ref={ref} className={`scene ${className ?? ""}`} style={{ ...style, height }}>
      <div className={`scene-stage ${stageClassName ?? ""}`}>{children}</div>
    </section>
  );
}

/** Desplazamiento parallax del contenido. speed > 0 se mueve mas lento que el scroll; < 0, en sentido contrario. */
export function Parallax({ speed = 0.2, className, children, as = "div" }: {
  speed?: number; className?: string; children?: ReactNode; as?: ElementType;
}) {
  const ref = useRef<HTMLElement>(null);
  const inner = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  useIsoLayoutEffect(() => {
    const el = ref.current, child = inner.current;
    if (!el || !child || reduced) { if (child) child.style.transform = ""; return; }
    return subscribe(() => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom < -200 || r.top > vh + 200) return;
      const offset = (r.top + r.height / 2 - vh / 2) * speed;
      child.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    });
  }, [speed, reduced]);
  return createElement(as, { ref, className: `parallax ${className ?? ""}`.trim() },
    createElement("div", { ref: inner, className: "parallax-inner" }, children));
}

/**
 * Inclinacion 3D con el puntero (solo con raton/trackpad; en tactil no hace nada).
 * Escribe --rx, --ry (grados) y --mx, --my (0..100 %, para brillos) en el elemento.
 * La clase .tilt (globals.css) aplica la transformacion; .tilt-glare agrega el brillo.
 */
export function Tilt({ max = 8, className, children, as = "div", glare = true, style }: {
  max?: number; className?: string; children?: ReactNode; as?: ElementType; glare?: boolean; style?: CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--ry", `${((x - 0.5) * 2 * max).toFixed(2)}deg`);
        el.style.setProperty("--rx", `${((0.5 - y) * 2 * max).toFixed(2)}deg`);
        el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
        el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
        el.classList.add("is-tilting");
      });
    };
    const leave = () => {
      cancelAnimationFrame(raf);
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
      el.classList.remove("is-tilting");
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); cancelAnimationFrame(raf); };
  }, [max, reduced]);
  return createElement(as, { ref, style, className: `tilt ${glare ? "tilt-glare" : ""} ${className ?? ""}`.trim() }, children);
}

/** Barra fija con el progreso de scroll de la pagina. */
export function ScrollProgressBar({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollProgress(ref, "page");
  return <div ref={ref} className={`scroll-progress ${className ?? ""}`.trim()} aria-hidden />;
}
