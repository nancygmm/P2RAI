import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | null | undefined;

function getApp(): App | null {
  if (app !== undefined) return app;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return (app = null);
  try {
    const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    app = getApps()[0] ?? initializeApp({ credential: cert(JSON.parse(json)) });
  } catch (e) {
    console.error("FIREBASE_SERVICE_ACCOUNT invalido:", e);
    app = null;
  }
  return app;
}

/** null = modo demo (sin Firebase en el servidor). */
export function adminDb(): Firestore | null {
  const a = getApp();
  return a ? getFirestore(a) : null;
}

export interface Caller { uid: string; isAdmin: boolean; demo: boolean }

/** Verifica el ID token de Firebase del encabezado Authorization. */
export async function getCaller(req: Request): Promise<Caller | null> {
  const a = getApp();
  if (!a) return { uid: "demo", isAdmin: true, demo: true };
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return null;
  try {
    const decoded = await getAuth(a).verifyIdToken(token);
    const snap = await getFirestore(a).doc(`users/${decoded.uid}`).get();
    return { uid: decoded.uid, isAdmin: snap.get("role") === "admin", demo: false };
  } catch {
    return null;
  }
}
