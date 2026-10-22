import type { CSSProperties } from "react";
import { Motif } from "./motifs";

/** Tono base (0-360) de tres colores por tema: [principal, secundario, acento]. */
const PALETTES: Record<string, [number, number, number]> = {
  politica: [352, 18, 282],
  economia: [152, 46, 98],
  seguridad: [218, 238, 188],
  salud: [172, 196, 338],
  educacion: [38, 16, 262],
  deportes: [16, 350, 48],
  tecnologia: [264, 198, 318],
  clima: [200, 172, 42],
  cultura: [322, 282, 22],
  transporte: [26, 212, 350],
  ciencia: [186, 246, 150],
};
const FALLBACK: [number, number, number] = [24, 258, 198];

export function topicKey(topic: string | undefined): string {
  return (topic ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Portada generativa determinista (sin imagen): paleta por tema, malla de degradados, orbe suave, grano,
 * motivo geométrico y palabra del tema. Capas .media-layer-back/mid/front con parallax 3D vía --p, --rx, --ry.
 * Es decorativa: aria-hidden y no pretende ser una foto.
 */
export function GenerativeCover({ id, topic, className }: { id: string; topic?: string; className?: string }) {
  const key = topicKey(topic);
  const word = topic || "noticia";
  const r = rng(hash(`${id}|${key}`));
  const [b1, b2, b3] = PALETTES[key] ?? FALLBACK;
  const shift = Math.round((r() - 0.5) * 36);
  const n = (min: number, max: number) => Math.round(min + r() * (max - min));
  const vars = {
    "--h1": (b1 + shift + 360) % 360,
    "--h2": (b2 + shift + 360) % 360,
    "--h3": (b3 + Math.round(shift / 2) + 360) % 360,
    "--ang": `${n(110, 250)}deg`,
    "--x1": `${n(0, 35)}%`, "--y1": `${n(0, 45)}%`,
    "--x2": `${n(60, 100)}%`, "--y2": `${n(10, 70)}%`,
    "--x3": `${n(25, 80)}%`, "--y3": `${n(70, 110)}%`,
    "--ox": `${n(32, 62)}%`, "--oy": `${n(-14, 18)}%`, "--os": `${n(58, 82)}%`,
    "--mr": `${n(-8, 8)}deg`, "--ms": (n(88, 112) / 100).toFixed(2), "--my": `${n(-6, 6)}%`,
    "--dl": `${n(0, 12)}s`,
    "--len": Math.max(word.length, 4),
  } as CSSProperties;
  return (
    <div className={`img placeholder media-cover ${className ?? ""}`} style={vars} aria-hidden>
      <div className="media-frame">
        <div className="media-stage">
          <div className="media-world">
            <div className="media-layer media-layer-back" />
            <div className="media-layer media-layer-mid">
              <div className="media-orb" />
              <div className="media-motif-wrap"><Motif topic={key} /></div>
            </div>
            <div className="media-layer media-layer-front">
              <span className="media-tag">Portada ilustrativa</span>
              <span className="media-kicker">{word}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
