// Siembra Firestore con las noticias FICTICIAS de ejemplo.
// Uso: npm run seed   (lee .env.local)
// Conviene re-sembrar el dia de la demo: las fechas se calculan al sembrar ("hace N horas").
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { seedArticles } from "../src/lib/seed";

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
  console.error("Falta FIREBASE_SERVICE_ACCOUNT en .env.local");
  process.exit(1);
}
const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
const db = getFirestore(initializeApp({ credential: cert(JSON.parse(json)) }));

// Misma regla de verificacion que el portal (src/lib/validation.ts), via seedArticles().
async function main() {
  const articles = seedArticles();
  const batch = db.batch();
  for (const { id, ...a } of articles) {
    batch.set(db.doc(`articles/${id}`), JSON.parse(JSON.stringify(a)));
  }
  await batch.commit();
  console.log(`Sembradas ${articles.length} noticias de ejemplo.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
