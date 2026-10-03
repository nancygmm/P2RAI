// Siembra Firestore con las noticias FICTICIAS de ejemplo.
// Uso: node --env-file=.env.local scripts/seed.mjs
import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) { console.error("Falta FIREBASE_SERVICE_ACCOUNT en .env.local"); process.exit(1); }
const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
const db = getFirestore(initializeApp({ credential: cert(JSON.parse(json)) }));

const host = (u) => new URL(u).hostname;
function verification(sources) { // misma regla que src/lib/validation.ts
  const conf = sources.filter((s) => s.supports === "confirma");
  if (sources.some((s) => s.supports === "contradice")) return "en_desarrollo";
  if (new Set(conf.map((s) => host(s.url))).size >= 2 || conf.some((s) => s.type !== "medio")) return "confirmada";
  return "en_desarrollo";
}

const data = JSON.parse(readFileSync(new URL("../src/lib/seed-data.json", import.meta.url), "utf8"));
const batch = db.batch();
for (const { id, hoursAgo, ...a } of data) {
  batch.set(db.doc(`articles/${id}`), { ...a, verification: verification(a.sources), publishedAt: Date.now() - hoursAgo * 3_600_000 });
}
await batch.commit();
console.log(`Sembradas ${data.length} noticias de ejemplo.`);
