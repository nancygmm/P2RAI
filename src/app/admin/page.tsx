"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { LOCATIONS, TOPICS } from "@/lib/locations";
import { useStore } from "@/lib/store";
import type { ImageOrigin, Place, Scope, Source } from "@/lib/types";
import { validateSources } from "@/lib/validation";

interface Usage { spent: number; calls: number; total: number; cap: number; remaining: number; aiEnabled: boolean; byFeature: Record<string, { usd: number; calls: number }> }

const emptySource = (): Source => ({ name: "", url: "", type: "medio", supports: "confirma" });
const usd = (n: number) => `USD ${n.toFixed(4)}`;

function UsagePanel() {
  const { getToken } = useAuth();
  const [u, setU] = useState<Usage | null>(null);
  useEffect(() => {
    (async () => {
      const r = await fetch("/api/usage", { headers: { authorization: `Bearer ${await getToken()}` } });
      if (r.ok) setU(await r.json());
    })();
  }, [getToken]);
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

export default function AdminPage() {
  const { user } = useAuth();
  const { isAdmin, ready, publish } = useStore();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [scope, setScope] = useState<Scope>("local");
  const [placeId, setPlaceId] = useState(LOCATIONS[0].id);
  const [sources, setSources] = useState<Source[]>([emptySource()]);
  const [imgUrl, setImgUrl] = useState("");
  const [imgOrigin, setImgOrigin] = useState<ImageOrigin>("licencia_libre");
  const [imgCredit, setImgCredit] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");

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

  const imageOk = !imgUrl.trim() || imgCredit.trim().length > 0 || imgOrigin === "generada_ia";
  const canPublish = v.canPublish && title.trim() && summary.trim() && body.trim() && topics.length > 0 && imageOk;
  const upd = (i: number, patch: Partial<Source>) => setSources((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canPublish || !v.verification) return;
    setState("saving");
    try {
      await publish({
        title: title.trim(), summary: summary.trim(), summaryOrigin: "humano", body: body.trim(),
        topics, scope, places,
        sources: sources.filter((s) => s.name.trim() && s.url.trim()),
        verification: v.verification,
        image: imgUrl.trim() ? { url: imgUrl.trim(), origin: imgOrigin, credit: imgCredit.trim() } : null,
        publishedAt: Date.now(), authorUid: user?.uid,
      });
      setTitle(""); setSummary(""); setBody(""); setTopics([]); setSources([emptySource()]); setImgUrl(""); setImgCredit("");
      setState("done");
    } catch (err) { console.error(err); setState("error"); }
  }

  return (
    <main className="admin">
      <Link href="/feed" className="back">← Ver app</Link>
      <h1>Portal administrativo</h1>
      <UsagePanel />

      <form className="panel" onSubmit={submit}>
        <h2>Nueva noticia</h2>
        <label>Título<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} /></label>
        <label>Resumen (lo escribe el editor)<textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={300} /></label>
        <label>Texto<textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} /></label>

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
            <div className="source" key={i}>
              <input placeholder="Nombre de la fuente" value={s.name} onChange={(e) => upd(i, { name: e.target.value })} />
              <input placeholder="https://…" value={s.url} onChange={(e) => upd(i, { url: e.target.value })} />
              <select value={s.type} onChange={(e) => upd(i, { type: e.target.value as Source["type"] })}>
                <option value="medio">Medio</option><option value="oficial">Oficial</option><option value="primaria">Primaria</option>
              </select>
              <select value={s.supports} onChange={(e) => upd(i, { supports: e.target.value as Source["supports"] })}>
                <option value="confirma">Confirma</option><option value="contradice">Contradice</option>
              </select>
              {sources.length > 1 && <button type="button" className="link" onClick={() => setSources((x) => x.filter((_, j) => j !== i))}>Quitar</button>}
            </div>
          ))}
          <button type="button" className="link" onClick={() => setSources((x) => [...x, emptySource()])}>+ Agregar fuente</button>
          <div className={`callout ${v.verification === "confirmada" ? "ok" : "warn"}`}>
            <b>{v.verification === "confirmada" ? "Se publicará como confirmada." : v.verification ? "Se publicará como en desarrollo." : "No se puede publicar."}</b> {v.note}
            <br /><small>Este estado lo calcula una regla sobre las fuentes que registras. La IA no decide si una noticia es verdadera.</small>
          </div>
        </fieldset>

        <fieldset>
          <legend>Imagen (opcional)</legend>
          <input placeholder="URL de la imagen" value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} />
          <div className="row">
            <label>Origen
              <select value={imgOrigin} onChange={(e) => setImgOrigin(e.target.value as ImageOrigin)}>
                <option value="licencia_libre">Licencia libre</option>
                <option value="propia">Propia</option>
                <option value="generada_ia">Generada con IA</option>
              </select>
            </label>
            <label>Crédito y licencia<input value={imgCredit} onChange={(e) => setImgCredit(e.target.value)} placeholder="Autor, CC BY-SA 4.0" /></label>
          </div>
          <p className="hint">
            ¿Sin imagen? Busca una con licencia libre en{" "}
            <a href={`https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(title)}&title=Special:MediaSearch&type=image`} target="_blank" rel="noreferrer">Wikimedia Commons</a>{" "}o{" "}
            <a href={`https://openverse.org/search/image?q=${encodeURIComponent(title)}`} target="_blank" rel="noreferrer">Openverse</a>{" "}
            y pega aquí su URL y crédito. Pendiente del equipo: búsqueda integrada y generación con IA.
          </p>
          {imgOrigin === "generada_ia" && <p className="hint">Se mostrará siempre con la insignia “Ilustración generada con IA · no es una foto del hecho”.</p>}
        </fieldset>

        <button className="btn primary" disabled={!canPublish || state === "saving"}>{state === "saving" ? "Publicando…" : "Publicar"}</button>
        {state === "done" && <p className="ok-text">Publicada. Ya aparece en la app.</p>}
        {state === "error" && <p className="error">No se pudo publicar. Revisa la consola y las reglas de Firestore.</p>}
      </form>
    </main>
  );
}
