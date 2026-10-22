import type { ReactNode } from "react";

/** Motivos geométricos por tema (viewBox 160x120). Solo trazos y rellenos translúcidos: decorativos. */

const rad = (d: number) => (d * Math.PI) / 180;
const pt = (cx: number, cy: number, r: number, deg: number) =>
  [Math.round((cx + r * Math.cos(rad(deg))) * 10) / 10, Math.round((cy - r * Math.sin(rad(deg))) * 10) / 10] as const;

function Politica() {
  const radii = [26, 42, 58, 74];
  const spokes = Array.from({ length: 11 }, (_, i) => 15 + i * 15);
  return (
    <>
      {radii.map((r) => <path key={r} d={`M${80 - r} 104 A${r} ${r} 0 0 1 ${80 + r} 104`} />)}
      {spokes.map((d) => {
        const a = pt(80, 104, 26, d), b = pt(80, 104, 74, d);
        return <line key={d} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} opacity=".4" />;
      })}
      {[42, 58].flatMap((r) => spokes.map((d) => {
        const p = pt(80, 104, r, d);
        return <circle key={`${r}-${d}`} cx={p[0]} cy={p[1]} r="2.6" fill="currentColor" stroke="none" />;
      }))}
      <line x1="6" y1="104" x2="154" y2="104" />
    </>
  );
}

function Economia() {
  const hs = [22, 34, 28, 50, 62, 84];
  const xs = hs.map((_, i) => 26 + i * 21);
  const pts = hs.map((h, i) => `${xs[i] + 6},${104 - h - 8}`).join(" ");
  return (
    <>
      {hs.map((h, i) => <rect key={i} x={xs[i]} y={104 - h} width="12" height={h} rx="2" className="m-fill" />)}
      <polyline points={pts} strokeWidth="2" />
      {hs.map((h, i) => <circle key={i} cx={xs[i] + 6} cy={104 - h - 8} r="3" fill="currentColor" />)}
      <line x1="14" y1="104" x2="150" y2="104" />
    </>
  );
}

function Seguridad() {
  return (
    <>
      <circle cx="80" cy="62" r="62" opacity=".3" />
      <circle cx="80" cy="62" r="48" opacity=".2" strokeDasharray="3 5" />
      <path d="M80 14 L124 31 V62 C124 87 106 103 80 112 C54 103 36 87 36 62 V31 Z" className="m-fill" />
      <path d="M80 28 L111 40 V62 C111 79 99 91 80 98 C61 91 49 79 49 62 V40 Z" opacity=".6" />
      <path d="M62 62 L75 75 L99 49" strokeWidth="2.4" />
    </>
  );
}

function Salud() {
  return (
    <>
      <circle cx="80" cy="56" r="48" opacity=".35" />
      <circle cx="80" cy="56" r="36" className="m-fill" />
      <path d="M72 34 H88 V48 H102 V64 H88 V78 H72 V64 H58 V48 H72 Z" fill="currentColor" stroke="none" opacity=".75" />
      <path d="M4 100 H44 L54 84 L66 112 L80 78 L92 104 L100 100 H156" strokeWidth="2" />
    </>
  );
}

function Educacion() {
  return (
    <>
      <path d="M80 38 C64 27 40 27 20 34 V94 C40 87 64 87 80 98 Z" className="m-fill" />
      <path d="M80 38 C96 27 120 27 140 34 V94 C120 87 96 87 80 98 Z" className="m-fill" />
      {[46, 56, 66].map((y, i) => <path key={y} d={`M32 ${y - 3 + i} C46 ${y - 6} 62 ${y - 4} 70 ${y + 2}`} opacity=".55" />)}
      {[46, 56, 66].map((y, i) => <path key={y} d={`M128 ${y - 3 + i} C114 ${y - 6} 98 ${y - 4} 90 ${y + 2}`} opacity=".55" />)}
      {[-40, -20, 0, 20, 40].map((d) => {
        const a = pt(80, 36, 14, 90 + d), b = pt(80, 36, 28, 90 + d);
        return <line key={d} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />;
      })}
      <circle cx="80" cy="36" r="4" fill="currentColor" stroke="none" />
    </>
  );
}

function Deportes() {
  return (
    <>
      <circle cx="80" cy="60" r="66" opacity=".22" strokeDasharray="2 6" />
      <circle cx="80" cy="60" r="54" opacity=".3" />
      <circle cx="80" cy="60" r="42" className="m-fill" />
      <line x1="80" y1="18" x2="80" y2="102" />
      <line x1="38" y1="60" x2="122" y2="60" />
      <path d="M52 26 C68 44 68 76 52 94" />
      <path d="M108 26 C92 44 92 76 108 94" />
    </>
  );
}

function Tecnologia() {
  const pins = [0, 1, 2, 3].map((i) => 61 + i * 13);
  return (
    <>
      <rect x="50" y="30" width="60" height="60" rx="9" className="m-fill" />
      <rect x="65" y="45" width="30" height="30" rx="5" strokeWidth="2" />
      {pins.map((p) => (
        <g key={p}>
          <line x1={p} y1="30" x2={p} y2="18" /><line x1={p} y1="90" x2={p} y2="102" />
          <line x1="50" y1={p - 1} x2="38" y2={p - 1} /><line x1="110" y1={p - 1} x2="122" y2={p - 1} />
        </g>
      ))}
      <path d="M38 60 H20 L8 48" opacity=".6" /><circle cx="8" cy="48" r="3" fill="currentColor" />
      <path d="M122 73 H140 L152 85" opacity=".6" /><circle cx="152" cy="85" r="3" fill="currentColor" />
      <path d="M74 18 V8 H100" opacity=".6" /><circle cx="100" cy="8" r="3" fill="currentColor" />
    </>
  );
}

function Clima() {
  const rays = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <>
      <circle cx="106" cy="40" r="20" className="m-fill" />
      {rays.map((d) => {
        const a = pt(106, 40, 27, d), b = pt(106, 40, d % 60 === 0 ? 40 : 35, d);
        return <line key={d} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />;
      })}
      <path d="M44 100 H108 A19 19 0 0 0 104 62 A28 28 0 0 0 54 70 A15 15 0 0 0 44 100 Z" className="m-fill" strokeWidth="1.8" />
      <path d="M20 112 q10 -6 20 0 t20 0 t20 0 t20 0 t20 0" opacity=".5" />
    </>
  );
}

function Cultura() {
  return (
    <>
      <circle cx="62" cy="62" r="34" className="m-fill" />
      <circle cx="100" cy="62" r="34" className="m-fill" />
      <circle cx="81" cy="38" r="34" className="m-fill" />
      <circle cx="81" cy="62" r="62" opacity=".25" strokeDasharray="1 6" />
      <path d="M14 10 Q40 30 30 56" opacity=".45" /><path d="M146 10 Q120 30 130 56" opacity=".45" />
      <path d="M81 8 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z" fill="currentColor" stroke="none" />
    </>
  );
}

function Transporte() {
  return (
    <>
      <line x1="4" y1="22" x2="156" y2="22" opacity=".5" />
      <path d="M18 116 L71 22" strokeWidth="2" /><path d="M142 116 L89 22" strokeWidth="2" />
      <line x1="80" y1="116" x2="80" y2="22" strokeDasharray="9 7" strokeWidth="2.2" />
      {[34, 48, 66, 90].map((y) => {
        const t = (y - 22) / 94;
        return <line key={y} x1={71 - 53 * t} y1={y} x2={89 + 53 * t} y2={y} opacity=".25" />;
      })}
      <circle cx="80" cy="16" r="12" className="m-fill" />
      <path d="M118 52 h22 m-7 -7 l7 7 -7 7" opacity=".7" strokeWidth="2" />
    </>
  );
}

function Ciencia() {
  return (
    <>
      {[0, 60, 120].map((r) => <ellipse key={r} cx="80" cy="60" rx="62" ry="22" transform={`rotate(${r} 80 60)`} />)}
      <circle cx="80" cy="60" r="9" fill="currentColor" stroke="none" />
      <circle cx="80" cy="60" r="16" className="m-fill" />
      {[[142, 60], [49, 6], [49, 114]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="4" fill="currentColor" stroke="none" />)}
    </>
  );
}

function Generico() {
  const dots: ReactNode[] = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 8; c++) dots.push(<circle key={`${r}${c}`} cx={20 + c * 17} cy={20 + r * 20} r="2.2" fill="currentColor" stroke="none" opacity={0.35 + ((r + c) % 3) * 0.2} />);
  return (<><circle cx="104" cy="60" r="48" className="m-fill" />{dots}<circle cx="104" cy="60" r="30" /><line x1="20" y1="104" x2="150" y2="14" opacity=".5" /></>);
}

const MOTIFS: Record<string, () => ReactNode> = {
  politica: Politica, economia: Economia, seguridad: Seguridad, salud: Salud, educacion: Educacion,
  deportes: Deportes, tecnologia: Tecnologia, clima: Clima, cultura: Cultura, transporte: Transporte, ciencia: Ciencia,
};

export function Motif({ topic }: { topic: string }) {
  const Comp = MOTIFS[topic] ?? Generico;
  return (
    <svg className="media-motif" viewBox="0 0 160 120" preserveAspectRatio="xMaxYMid meet" fill="none" stroke="currentColor"
      strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" focusable="false" aria-hidden>
      <Comp />
    </svg>
  );
}
