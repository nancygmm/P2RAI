import assert from "node:assert/strict";
import { seedArticles } from "../src/lib/seed";
import { LOCATIONS, getLocation } from "../src/lib/locations";
import { rankFeed, bucketOf, geoScore, TOP_N } from "../src/lib/relevance";
import { retrieve } from "../src/lib/retrieval";
import { registrableDomain, validateSources } from "../src/lib/validation";
import { toArticle } from "../src/lib/article";
import type { Affinity, Source } from "../src/lib/types";

const arts = seedArticles();
const byId = (id: string) => arts.find((a) => a.id === id)!;

/* ---------------- Feed: orden, prominencia y cupos anti-burbuja ---------------- */
for (const id of ["gt-guatemala", "gt-antigua", "gt-xela", "mx-cdmx", "es-madrid"]) {
  const loc = getLocation(id);
  const r = rankFeed(arts, loc, {});
  console.log(`\n== ${loc.label}`);
  r.slice(0, TOP_N).forEach((x, i) => console.log(`${i + 1}. [${x.tier}] ${x.score.toFixed(2)} ${x.article.title.slice(0, 55)} | ${x.reason}`));
  assert.equal(r[0].article.verification, "confirmada", "portada sin confirmar");
  assert.equal(r.length, arts.length, "ninguna noticia se oculta");
}

// La garantia debe sostenerse tambien cuando el usuario ya tiene intereses (Loop 1 regreso con afinidad).
const affinities: Affinity[] = [{}, { transporte: 5 }, { cultura: 3 }, { salud: 5 }, { transporte: 10, cultura: 2 }, { "economía": 4 }];
for (const loc of LOCATIONS) {
  for (const aff of affinities) {
    const r = rankFeed(arts, loc, aff);
    const top = r.slice(0, TOP_N);
    const tag = `${loc.id} ${JSON.stringify(aff)}`;
    assert(top.some((x) => x.article.scope === "internacional"), `${tag}: el top ${TOP_N} no tiene ninguna noticia de ámbito internacional`);
    const hasLocal = arts.some((a) => bucketOf(a, geoScore(a, loc)) === "local");
    if (hasLocal) assert(top.some((x) => bucketOf(x.article, geoScore(x.article, loc)) === "local"), `${tag}: falta local`);
    assert.equal(r[0].article.verification, "confirmada", `${tag}: portada sin confirmar`);
    for (const x of top) if (x.reserved) assert.notEqual(x.tier, "compact", `${tag}: reservado sin prominencia`);
    // Una nota local de otro pais nunca se presenta como "internacional imprescindible".
    for (const x of r) if (x.reason.includes("internacional")) assert.equal(x.article.scope, "internacional", `${tag}: ${x.article.id} etiquetada internacional`);
  }
}

const pos = (id: string) => rankFeed(arts, getLocation(id), {}).findIndex((x) => x.article.id === "ej-03");
assert(pos("gt-antigua") < pos("es-madrid"));
const withAff = rankFeed(arts, getLocation("gt-guatemala"), { salud: 10 });
assert(withAff.findIndex((x) => x.article.id === "ej-09") < rankFeed(arts, getLocation("gt-guatemala"), {}).findIndex((x) => x.article.id === "ej-09"));
// El motivo nunca queda en un "Reciente" vago para noticias de otro pais.
assert(rankFeed(arts, getLocation("gt-guatemala"), {}).find((x) => x.article.id === "ej-16")!.reason.includes("Colombia"));

/* ---------------- Validacion de fuentes ---------------- */
const src = (url: string, extra: Partial<Source> = {}): Source => ({ name: "Fuente", url, type: "medio", supports: "confirma", ...extra });
assert.equal(validateSources([]).canPublish, false);
assert.equal(byId("ej-08").verification, "en_desarrollo");
assert.equal(byId("ej-04").verification, "en_desarrollo");
assert.equal(byId("ej-07").verification, "confirmada");
assert.equal(byId("ej-02").verification, "confirmada", "dos medios .example distintos son independientes");
// Texto que no es URL no cuenta como fuente (antes "a" y "b" confirmaban una noticia).
const fake = validateSources([src("a"), src("b")]);
assert.equal(fake.canPublish, false);
assert.deepEqual(fake.invalid, [0, 1]);
assert.equal(validateSources([src("javascript:alert(1)")]).canPublish, false);
assert.equal(validateSources([src("https://localhost/x")]).canPublish, false);
// Subdominios del mismo medio no son independientes.
assert.equal(validateSources([src("https://noticias.medio.com/a"), src("https://www2.medio.com/b")]).verification, "en_desarrollo");
assert.equal(validateSources([src("https://www.prensalibre.com/a"), src("https://www.soy502.com/b")]).verification, "confirmada");
assert.equal(registrableDomain("www.minsalud.gob.gt"), "minsalud.gob.gt");
assert.equal(registrableDomain("deportes.prensa.com.gt"), "prensa.com.gt");
assert.equal(validateSources([src("https://a.prensa.com.gt/1"), src("https://b.prensa.com.gt/2")]).verification, "en_desarrollo");
assert.equal(validateSources([src("https://prensa.com.gt/1"), src("https://minsalud.gob.gt/2")]).verification, "confirmada");
assert.equal(validateSources([src("https://x.com/1", { type: "oficial" })]).verification, "confirmada");
assert.equal(validateSources([src("https://x.com/1"), src("https://y.com/2", { supports: "contradice" })]).contradictory, true);

/* ---------------- Recuperacion para el chat ---------------- */
const gt = getLocation("gt-guatemala");
const ids = (q: string, loc = gt) => retrieve(q, arts, loc).articles.map((a) => a.id);
assert.equal(ids("¿Qué pasó con la tarifa eléctrica?")[0], "ej-08");
assert.equal(ids("noticias de Madrid")[0], "ej-14");
assert(retrieve("¿Qué hay cerca de mi zona?", arts, gt).articles.every((a) => geoScore(a, gt) >= 0.45));
assert(ids("resumen de hoy").length > 0);
assert.equal(ids("receta de pastel de zanahoria").length, 0);
// Preguntas internacionales: antes respondian "no hay noticias".
for (const q of ["¿Qué pasa en el mundo?", "noticias internacionales", "explícame una noticia importante de otro país", "¿qué pasa en el extranjero?"]) {
  const r = retrieve(q, arts, gt).articles;
  assert(r.length > 0, `${q}: sin resultados`);
  assert.equal(r[0].scope, "internacional", `${q}: la primera no es internacional (${r[0].id})`);
  assert(r.slice(0, 2).every((a) => a.scope === "internacional"), `${q}: las dos internacionales no van primero`);
}
assert.deepEqual(ids("¿hay algo de seguridad cerca?"), ["ej-04"], "cerca excluye otros países");
assert(ids("dame lo más importante").length > 0, "pregunta genérica con verbo de relleno");
assert.equal(ids("vacunas")[0], "ej-09", "plural/raíz: vacunas ~ vacunación");
// Region: la noticia regional debe aparecer primero.
assert.equal(ids("¿Qué pasa en Centroamérica?")[0], "ej-10");
assert.equal(ids("¿Qué noticias hay en mi región?")[0], "ej-10");
assert.equal(ids("noticias centroamericanas")[0], "ej-10");
// "Antigua Guatemala" no es "Guatemala".
assert.deepEqual(ids("¿Qué pasa en Antigua Guatemala?"), ["ej-03"]);
// Lugar sin noticias: no se responde con noticias de otro pais.
const fr = retrieve("¿Qué pasa en Francia con la economía?", arts, gt);
assert.equal(fr.articles.length, 0);
assert.deepEqual(fr.missing, ["Francia"]);
// Lugar con noticias, pero no de ese tema: sin resultados y sin decir que el lugar no existe.
const md = retrieve("¿Qué pasa en Madrid con la economía?", arts, gt);
assert.equal(md.articles.length, 0);
assert.deepEqual(md.missing, []);
// Pais: lo nacional va antes que lo local de la capital.
assert.equal(byId(ids("¿Qué pasa en Guatemala?", getLocation("es-madrid"))[0]).scope, "nacional");
assert.equal(ids("novedades de Bogotá")[0], "ej-16");
assert.equal(ids("¿qué pasa en México?")[0], "ej-12");

// Palabras de relleno junto a un lugar no vacían la respuesta (regresión detectada en revisión).
assert.deepEqual(ids("¿Qué sabes de Madrid?"), ["ej-14"]);
assert.deepEqual(ids("Cuéntame de Bogotá por favor"), ["ej-16"]);
assert.deepEqual(ids("¿Qué onda con Xela?"), ["ej-05"]);
assert.deepEqual(ids("¿Hay algo sobre Antigua o Xela?").sort(), ["ej-03", "ej-05"]);
// "El mundo" no incluye notas locales de otros países; "fuera de X" excluye X.
assert.deepEqual(ids("¿Qué pasa en el mundo?"), ["ej-13", "ej-15"]);
assert.deepEqual(ids("fuera de Guatemala"), ["ej-13", "ej-15"]);
assert.deepEqual(ids("noticias extranjeras"), ["ej-13", "ej-15"]);
assert.deepEqual(ids("¿qué pasa en el resto del mundo?"), ["ej-13", "ej-15"]);
// Intención nacional según la ubicación del usuario.
assert.deepEqual(ids("noticias nacionales"), ["ej-07", "ej-08", "ej-09"]);
assert.equal(ids("noticias nacionales", getLocation("es-madrid")).length, 0);
assert.deepEqual(ids("¿Qué pasa en el país?", getLocation("co-bogota")), ["ej-16"]);
// Raíces sin falsos amigos frecuentes.
assert.equal(ids("transparencia del gobierno").length, 0);
assert.equal(ids("internet").length, 0);
assert.equal(ids("autos").length, 0);
assert.deepEqual(ids("noticias españolas"), ["ej-14"]);
assert.equal(ids("precio del chile").length, 0);
assert.deepEqual(retrieve("precio del chile", arts, gt).missing, []);

/* ---------------- Documentos mal formados ---------------- */
assert.equal(toArticle("x", { body: "sin título" }), null);
const broken = toArticle("y", { title: "T", publishedAt: { seconds: 1_700_000_000 }, verification: "verdadera", image: { url: "https://a.b/c.jpg", origin: "foto_real" } })!;
assert.equal(broken.publishedAt, 1_700_000_000_000);
assert.equal(broken.verification, "en_desarrollo", "verificación desconocida queda en desarrollo");
assert.equal(toArticle("w", { title: "T", verification: "confirmada", sources: [] })!.verification, "en_desarrollo", "sin fuentes no hay confirmación");
assert.equal(broken.image?.origin, "archivo", "origen de imagen desconocido nunca se presenta como foto del hecho");
assert.deepEqual(broken.places, []);
// Una imagen servida por /api/images siempre lleva el sello de IA, aunque el documento diga otra cosa.
assert.equal(toArticle("z", { title: "T", image: { url: "/api/images/abcdefghijABCDEFGHIJ.0123456789abcdef", origin: "licencia_libre" } })!.image?.origin, "generada_ia");
assert.doesNotThrow(() => rankFeed([...arts, broken], gt, {}));
assert.doesNotThrow(() => retrieve("transporte", [...arts, broken], gt));

console.log("\nOK: todas las pruebas pasaron");
