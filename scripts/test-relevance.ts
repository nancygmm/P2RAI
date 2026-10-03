import assert from "node:assert/strict";
import { seedArticles } from "../src/lib/seed";
import { getLocation } from "../src/lib/locations";
import { rankFeed, bucketOf, geoScore, TOP_N } from "../src/lib/relevance";
import { retrieve } from "../src/lib/retrieval";
import { validateSources } from "../src/lib/validation";

const arts = seedArticles();
for (const id of ["gt-guatemala", "gt-antigua", "gt-xela", "mx-cdmx", "es-madrid"]) {
  const loc = getLocation(id);
  const r = rankFeed(arts, loc, {});
  console.log(`\n== ${loc.label}`);
  r.slice(0, TOP_N).forEach((x, i) => console.log(`${i + 1}. [${x.tier}] ${x.score.toFixed(2)} ${x.article.title.slice(0, 55)} | ${x.reason}`));
  const top = r.slice(0, TOP_N);
  const buckets = new Set(top.map((x) => bucketOf(x.article, geoScore(x.article, loc))));
  assert(buckets.has("local"), `${id}: falta local`);
  assert(buckets.has("internacional"), `${id}: falta internacional`);
  assert.equal(r[0].article.verification, "confirmada", "portada sin confirmar");
  assert.equal(r.length, arts.length, "ninguna noticia se oculta");
}
const pos = (id: string) => rankFeed(arts, getLocation(id), {}).findIndex((x) => x.article.id === "ej-03");
assert(pos("gt-antigua") < pos("es-madrid"));
const withAff = rankFeed(arts, getLocation("gt-guatemala"), { salud: 10 });
assert(withAff.findIndex((x) => x.article.id === "ej-09") < rankFeed(arts, getLocation("gt-guatemala"), {}).findIndex((x) => x.article.id === "ej-09"));
assert.equal(validateSources([]).canPublish, false);
assert.equal(arts.find((a) => a.id === "ej-08")!.verification, "en_desarrollo");
assert.equal(arts.find((a) => a.id === "ej-04")!.verification, "en_desarrollo");
assert.equal(arts.find((a) => a.id === "ej-07")!.verification, "confirmada");
const loc = getLocation("gt-guatemala");
assert.equal(retrieve("¿Qué pasó con la tarifa eléctrica?", arts, loc)[0].id, "ej-08");
assert.equal(retrieve("noticias de Madrid", arts, loc)[0].id, "ej-14");
assert(retrieve("¿Qué hay cerca de mi zona?", arts, loc).every((a) => geoScore(a, loc) >= 0.45));
assert(retrieve("resumen de hoy", arts, loc).length > 0);
assert.equal(retrieve("receta de pastel de zanahoria", arts, loc).length, 0);
console.log("\nOK: todas las pruebas pasaron");
