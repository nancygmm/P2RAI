"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ImageStamp } from "@/components/Badges";
import { LOCATIONS, TOPICS } from "@/lib/locations";
import { useStore } from "@/lib/store";
import type { ArticleImage, ImageOrigin, Place, Scope, Source } from "@/lib/types";
import { parseSourceUrl, validateSources } from "@/lib/validation";

interface Usage {
  spent: number; calls: number; total: number; cap: number; remaining: number; aiEnabled: boolean;
  byFeature: Record<string, { usd: number; calls: number }>;
  imageGen?: { enabled: boolean; status?: "ok" | "sin_llave" | "modo_simulado"; model: string; estimateUsd: number };
}
interface LicensedImage { id: string; title: string; url: string; thumbnail: string; creator: string; license: string; licenseUrl: string; landingUrl: string; provider: string }

const emptySource = (): Source => ({ name: "", url: "", type: "medio", supports: "confirma" });
const usd = (n: number) => `USD ${n.toFixed(4)}`;

/** Imagen generada y servida por la propia app (URL firmada). */
const GENERATED = /^\/api\/images\/[A-Za-z0-9]{20}\.[A-Za-z0-9_-]{16}$/;

/** Imagen aceptable: https directa, o generada por la app y declarada como generada con IA. */
function imageOk(img: ArticleImage): boolean {
  const u = img.url.trim();
  if (u.startsWith("/api/images/")) return GENERATED.test(u) && img.origin === "generada_ia";
  const parsed = parseSourceUrl(u);
  return !!parsed && parsed.protocol === "https:" && img.credit.trim().length > 0;
}

const ORIGIN_OPTIONS: { value: ImageOrigin; label: string }[] = [
  { value: "archivo", label: "De archivo (ilustrativa, no es del hecho)" },
  { value: "licencia_libre", label: "Licencia libre (es del hecho)" },
  { value: "propia", label: "Propia" },
  { value: "alterada_ia", label: "Alterada con IA" },
  { value: "generada_ia", label: "Generada con IA" },
];

function UsagePanel({ u }: { u: Usage | null }) {
  if (!u) return null;
  return (
    <section className="panel">
      <h2>Gasto de IA</h2>
      <div className="stats">
        <div><b>{usd(u.spent)}</b><span>gastado</span></div>
        <div><b>USD {u.remaining.toFixed(2)}</b><span>saldo de {u.total}</span></div>
        <div><b>USD {u.cap}</b><span>tope (reserva {u.total - u.cap})</span></div>
        <div><b>{u.calls}</b><span>llamadas</span></div>
      </div>
      <progress max={u.total} value={u.spent} />
      {Object.entries(u.byFeature).map(([f, v]) => (
        <p key={f} className="hint">{f}: {v.calls} llamadas · {usd(v.usd)} · {usd(v.calls ? v.usd / v.calls : 0)} por uso</p>
      ))}
      {!u.aiEnabled && <p className="hint">IA en modo simulado: no se está gastando.</p>}
    </section>
  );
}

type ImageMode = "buscar" | "generar" | "url";

function ImagePicker({ title, summary, image, onChange, usage, onSpent }: {
  title: string; summary: string; image: ArticleImage | null; onChange: (img: ArticleImage | null) => void;
  usage: Usage | null; onSpent: () => void;
}) {
  const { getToken } = useAuth();
  const [mode, setMode] = useState<ImageMode>("buscar");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<LicensedImage[] | null>(null);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  /** De donde vino la imagen actual: limita los origenes que se pueden declarar. */
  const [from, setFrom] = useState<"busqueda" | "ia" | "url" | null>(null);
  const [lastCost, setLastCost] = useState<number | null>(null);
  const gen = usage?.imageGen;

  useEffect(() => { setBroken(false); }, [image?.url]);

  async function api(path: string, init?: RequestInit) {
    const res = await fetch(path, { ...init, headers: { ...(init?.headers ?? {}), authorization: `Bearer ${await getToken()}` } });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? `Error ${res.status}`);
    return data;
  }

  async function search() {
    const query = (q || title).trim();
    if (!query) return setErr("Escribe qué buscar (o un título).");
    setBusy(true); setErr(null);
    try { setResults((await api(`/api/images/search?q=${encodeURIComponent(query)}`)).results); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function generate() {
    const text = (prompt || [title, summary].filter(Boolean).join(". ")).trim();
    if (text.length < 10) return setErr("Escribe primero el título o una descripción de la imagen.");
    setBusy(true); setErr(null);
    try {
      const img = await api("/api/images/generate", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: text }),
      });
      onChange({ url: img.url, origin: "generada_ia", credit: `Generada con IA (${img.model})`, model: img.model, prompt: img.prompt });
      setFrom("ia");
      setLastCost(typeof img.usd === "number" ? img.usd : null);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); onSpent(); }
  }

  function pick(r: LicensedImage) {
    onChange({
      url: r.url,
      // Una foto de archivo casi nunca es del hecho: se etiqueta como ilustrativa.
      origin: "archivo",
      credit: `${r.title ? `«${r.title}» · ` : ""}${r.creator} · ${r.license} · vía ${r.provider ? `${r.provider}/` : ""}Openverse`,
      title: r.title || undefined,
      licenseUrl: r.licenseUrl.startsWith("https://") ? r.licenseUrl : undefined,
      sourceUrl: r.landingUrl || undefined,
    });
    setFrom("busqueda");
  }

  // Una imagen generada no se puede declarar como foto; una de archivo solo puede pasar a
  // "es del hecho" (licencia libre), nunca a propia ni a IA.
  const generated = !!image?.url.startsWith("/api/images/");
  const options = generated
    ? ORIGIN_OPTIONS.filter((o) => o.value === "generada_ia")
    : from === "busqueda"
      ? ORIGIN_OPTIONS.filter((o) => o.value === "archivo" || o.value === "licencia_libre")
      : ORIGIN_OPTIONS; // URL externa: se puede declarar cualquier origen (marcarla como IA es lo prudente si lo es)

  return (
    <fieldset>
      <legend>Imagen</legend>
      {!image && (
        <div className="callout warn">
          Esta noticia no tiene imagen. Puedes buscar una con licencia libre (gratis) o generar una ilustración con IA.
          Si publicas sin imagen, se mostrará un marcador neutro.
        </div>
      )}

      {image && (
        <div className="img-preview">
          <div className="img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt="Vista previa" onError={() => setBroken(true)} onLoad={() => setBroken(false)} />
            <ImageStamp origin={image.origin} />
          </div>
          {broken && <p className="error">No se pudo cargar la imagen. Usa un enlace directo a la imagen (.jpg, .png, .webp), no a la página.</p>}
          <div className="row">
            <label>Origen
              <select value={image.origin} onChange={(e) => onChange({ ...image, origin: e.target.value as ImageOrigin })} disabled={generated}>
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label>Crédito y licencia<input value={image.credit} onChange={(e) => onChange({ ...image, credit: e.target.value })} placeholder="Autor, CC BY-SA 4.0" /></label>
          </div>
          {generated && lastCost !== null && <p className="hint">Costo de esta ilustración: USD {lastCost.toFixed(4)}.</p>}
          <button type="button" className="link" onClick={() => { onChange(null); setFrom(null); }}>Quitar imagen</button>
        </div>
      )}

      <div className="tabs" role="tablist">
        {(["buscar", "generar", "url"] as ImageMode[]).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} className={mode === m ? "on" : ""} onClick={() => { setMode(m); setErr(null); }}>
            {m === "buscar" ? "Buscar con licencia (gratis)" : m === "generar" ? "Generar con IA" : "Pegar URL"}
          </button>
        ))}
      </div>

      {mode === "buscar" && (
        <div className="picker">
          <div className="inline">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={title ? `Buscar: ${title}` : "¿Qué buscar? (en inglés suele dar más resultados)"}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }} />
            <button type="button" className="btn" onClick={search} disabled={busy}>{busy ? "Buscando…" : "Buscar"}</button>
          </div>
          <p className="hint">Imágenes de Openverse con licencia Creative Commons. Se marcan como “de archivo”: no documentan este hecho.</p>
          {results && results.length === 0 && <p className="hint">Sin resultados. Prueba con otras palabras.</p>}
          {results && results.length > 0 && (
            <div className="thumbs">
              {results.map((r) => (
                <button type="button" key={r.id} onClick={() => pick(r)} title={`${r.title} — ${r.creator} (${r.license})`}
                  className={image?.url === r.url ? "on" : ""}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.thumbnail || r.url} alt={r.title || "Resultado"} loading="lazy" />
                  <span>{r.license}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === "generar" && (
        <div className="picker">
          {gen?.enabled ? (
            <>
              <label>Descripción de la ilustración (editable)
                <textarea rows={3} maxLength={800} value={prompt} onChange={(e) => setPrompt(e.target.value)}
                  placeholder={[title, summary].filter(Boolean).join(". ") || "Describe la escena de forma simbólica"} />
              </label>
              <p className="hint">
                Se le pide al modelo una <b>ilustración</b> (no fotorrealista, sin personas reales identificables) y se publica siempre con el sello
                “Ilustración generada con IA · no es una foto del hecho”. Revisa el resultado antes de publicar. Modelo {gen.model},
                ≈ USD {gen.estimateUsd.toFixed(3)} por imagen, descontado del presupuesto de IA.
              </p>
              <button type="button" className="btn" onClick={generate} disabled={busy}>{busy ? "Generando… (hasta 40 s)" : "Generar ilustración"}</button>
            </>
          ) : (
            <p className="hint">
              {gen?.status === "modo_simulado"
                ? "La generación con IA está apagada porque el servidor está en modo simulado (AI_MOCK=1)."
                : gen?.status === "sin_llave"
                  ? <>La generación con IA no está activa: falta configurar <code>OPENROUTER_API_KEY</code> en el servidor (ver docs/configuracion.md).</>
                  : "No se pudo consultar si la generación con IA está disponible. Recarga la página."}
              {" "}Mientras tanto, usa la búsqueda con licencia.
            </p>
          )}
        </div>
      )}

      {mode === "url" && (
        <div className="picker">
          <input placeholder="https://…/imagen.jpg" value={image?.url && !image.model ? image.url : ""}
            onChange={(e) => {
              const url = e.target.value;
              setFrom("url");
              if (!url.trim()) return onChange(null);
              if (url.trim().startsWith("/api/images/")) return onChange({ url, origin: "generada_ia", credit: "Generada con IA" });
              onChange({ url, origin: image?.origin && image.origin !== "generada_ia" ? image.origin : "licencia_libre", credit: image?.model ? "" : image?.credit ?? "" });
            }} />
          <p className="hint">Enlace directo y https. Indica abajo el origen real y el crédito.</p>
        </div>
      )}

      {err && <p className="error">{err}</p>}
    </fieldset>
  );
}

export default function AdminPage() {
  const { user, getToken } = useAuth();
  const { isAdmin, ready, publish } = useStore();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [scope, setScope] = useState<Scope>("local");
  const [placeId, setPlaceId] = useState(LOCATIONS[0].id);
  const [sources, setSources] = useState<Source[]>([emptySource()]);
  const [image, setImage] = useState<ArticleImage | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [usage, setUsage] = useState<Usage | null>(null);
  /** Cambia en cada publicacion para reiniciar el selector de imagen (prompt, busqueda, resultados). */
  const [published, setPublished] = useState(0);

  const loadUsage = useCallback(async () => {
    try {
      const r = await fetch("/api/usage", { headers: { authorization: `Bearer ${await getToken()}` } });
      if (r.ok) setUsage(await r.json());
    } catch { /* el panel es informativo */ }
  }, [getToken]);
  useEffect(() => { if (isAdmin) loadUsage(); }, [isAdmin, loadUsage]);

  const v = useMemo(() => validateSources(sources), [sources]);

  if (!ready) return <main className="center">Cargando…</main>;
  if (!isAdmin) return <main className="center">Tu cuenta no tiene rol de administrador. <Link href="/">Volver</Link></main>;

  const places: Place[] = (() => {
    const l = LOCATIONS.find((x) => x.id === placeId)!;
    if (scope === "internacional") return [];
    if (scope === "regional") return [{ region: l.region }];
    if (scope === "nacional") return [{ country: l.country, region: l.region }];
    return [{ city: l.city, department: l.department, country: l.country, region: l.region }];
  })();

  const imgValid = !image || imageOk(image);
  const canPublish = v.canPublish && title.trim() && summary.trim() && body.trim() && topics.length > 0 && imgValid;
  const upd = (i: number, patch: Partial<Source>) => setSources((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canPublish || !v.verification) return;
    setState("saving");
    try {
      const img: ArticleImage | null = image
        ? Object.fromEntries(Object.entries({ ...image, url: image.url.trim(), credit: image.credit.trim() }).filter(([, x]) => x !== undefined && x !== "")) as unknown as ArticleImage
        : null;
      await publish({
        title: title.trim(), summary: summary.trim(), summaryOrigin: "humano", body: body.trim(),
        topics, scope, places,
        sources: sources.filter((s) => s.name.trim() && s.url.trim()).map((s) => ({ ...s, name: s.name.trim(), url: s.url.trim() })),
        verification: v.verification,
        image: img,
        publishedAt: Date.now(), ...(user?.uid ? { authorUid: user.uid } : {}),
      });
      setTitle(""); setSummary(""); setBody(""); setTopics([]); setSources([emptySource()]); setImage(null);
      setPublished((n) => n + 1);
      setState("done");
      loadUsage();
    } catch (err) { console.error(err); setState("error"); }
  }

  return (
    <main className="admin">
      <Link href="/feed" className="back">← Ver app</Link>
      <h1>Portal administrativo</h1>
      <UsagePanel u={usage} />

      <form className="panel" onSubmit={submit}>
        <h2>Nueva noticia</h2>
        <label>Título<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} /></label>
        <label>Resumen (lo escribe el editor)<textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={300} /></label>
        <label>Texto<textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} maxLength={15000} /></label>

        <fieldset>
          <legend>Temas</legend>
          <div className="chips">
            {TOPICS.map((t) => (
              <button type="button" key={t} className={topics.includes(t) ? "on" : ""}
                onClick={() => setTopics((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))}>{t}</button>
            ))}
          </div>
        </fieldset>

        <div className="row">
          <label>Alcance
            <select value={scope} onChange={(e) => setScope(e.target.value as Scope)}>
              <option value="local">Local (ciudad)</option>
              <option value="nacional">Nacional</option>
              <option value="regional">Regional</option>
              <option value="internacional">Internacional</option>
            </select>
          </label>
          {scope !== "internacional" && (
            <label>Lugar
              <select value={placeId} onChange={(e) => setPlaceId(e.target.value)}>
                {LOCATIONS.map((l) => <option key={l.id} value={l.id}>{scope === "local" ? l.label : scope === "nacional" ? l.country : l.region} ({l.label})</option>)}
              </select>
            </label>
          )}
        </div>

        <fieldset>
          <legend>Fuentes (obligatorio)</legend>
          {sources.map((s, i) => (
            <div className={`source ${v.invalid.includes(i) ? "invalid" : ""}`} key={i}>
              <input placeholder="Nombre de la fuente" value={s.name} onChange={(e) => upd(i, { name: e.target.value })} maxLength={120} />
              <input placeholder="https://…" value={s.url} onChange={(e) => upd(i, { url: e.target.value })} inputMode="url" aria-invalid={v.invalid.includes(i)} maxLength={500} />
              <select value={s.type} onChange={(e) => upd(i, { type: e.target.value as Source["type"] })}>
                <option value="medio">Medio</option><option value="oficial">Oficial</option><option value="primaria">Primaria</option>
              </select>
              <select value={s.supports} onChange={(e) => upd(i, { supports: e.target.value as Source["supports"] })}>
                <option value="confirma">Confirma</option><option value="contradice">Contradice</option>
              </select>
              {sources.length > 1 && <button type="button" className="link" onClick={() => setSources((x) => x.filter((_, j) => j !== i))}>Quitar</button>}
            </div>
          ))}
          {sources.length < 10 && <button type="button" className="link" onClick={() => setSources((x) => [...x, emptySource()])}>+ Agregar fuente</button>}
          <div className={`callout ${v.verification === "confirmada" ? "ok" : "warn"}`}>
            <b>{v.verification === "confirmada" ? "Se publicará como confirmada." : v.verification ? "Se publicará como en desarrollo." : "No se puede publicar."}</b> {v.note}
            <br /><small>Este estado lo calcula una regla sobre las fuentes que registras (dos medios de dominios distintos, o una fuente oficial/primaria). La IA no decide si una noticia es verdadera.</small>
          </div>
        </fieldset>

        <ImagePicker key={published} title={title} summary={summary} image={image} onChange={setImage} usage={usage} onSpent={loadUsage} />

        <button className="btn primary" disabled={!canPublish || state === "saving"}>{state === "saving" ? "Publicando…" : "Publicar"}</button>
        {image && !imgValid && <p className="error">Revisa la imagen: enlace https directo y crédito/licencia obligatorios.</p>}
        {state === "done" && <p className="ok-text">Publicada. Ya aparece en la app.</p>}
        {state === "error" && <p className="error">No se pudo publicar. Revisa la consola y las reglas de Firestore.</p>}
      </form>
    </main>
  );
}
