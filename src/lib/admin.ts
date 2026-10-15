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
    // Sin detalles del error: podria incluir fragmentos de la clave privada.
    console.error("FIREBASE_SERVICE_ACCOUNT invalido:", e instanceof SyntaxError ? "JSON mal formado" : (e as Error).name);
    app = null;
  }
  return app;
}

/**
 * El modo demo del servidor (sin Firebase) solo existe en desarrollo. En produccion una cuenta
 * de servicio ausente o invalida debe cerrar el acceso, no abrirlo a cualquiera como admin.
 * ALLOW_DEMO_SERVER=1 lo permite a proposito (p. ej. `next start` local sin Firebase).
 */
export function demoServerAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_SERVER === "1";
}

/** null = sin Firebase en el servidor (modo demo en desarrollo, o configuracion rota en produccion). */
export function adminDb(): Firestore | null {
  const a = getApp();
  return a ? getFirestore(a) : null;
}

export interface Caller { uid: string; isAdmin: boolean; demo: boolean }

// El rol se cachea un minuto por instancia: evita una lectura de Firestore por peticion.
const roleCache = new Map<string, { isAdmin: boolean; exp: number }>();
const ROLE_TTL_MS = 60_000;

/**
 * Verifica el ID token de Firebase del encabezado Authorization.
 * Con `role: false` no se lee el rol (ruta que no lo necesita: cero lecturas de Firestore).
 */
export async function getCaller(req: Request, opts: { role?: boolean } = {}): Promise<Caller | null> {
  const a = getApp();
  if (!a) {
    if (demoServerAllowed()) return { uid: "demo", isAdmin: true, demo: true };
    console.error("Admin SDK no disponible en produccion: se rechaza la peticion (revisar FIREBASE_SERVICE_ACCOUNT).");
    return null;
  }
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  try {
    const decoded = await getAuth(a).verifyIdToken(token);
    if (opts.role === false) return { uid: decoded.uid, isAdmin: false, demo: false };
    const now = Date.now();
    const hit = roleCache.get(decoded.uid);
    if (hit && hit.exp > now) return { uid: decoded.uid, isAdmin: hit.isAdmin, demo: false };
    const snap = await getFirestore(a).doc(`users/${decoded.uid}`).get();
    const isAdmin = snap.get("role") === "admin";
    if (roleCache.size > 2000) roleCache.clear();
    roleCache.set(decoded.uid, { isAdmin, exp: now + ROLE_TTL_MS });
    return { uid: decoded.uid, isAdmin, demo: false };
  } catch {
    return null;
  }
}
