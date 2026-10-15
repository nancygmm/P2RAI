import "server-only";

/**
 * Limite de frecuencia en memoria (ventana fija). Vive en cada instancia del servidor:
 * no reemplaza a un limite global, pero frena rafagas antes de tocar Firestore o la IA.
 */
const buckets = new Map<string, { n: number; reset: number }>();

export function allow(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const b = buckets.get(key);
  if (!b || now >= b.reset) {
    if (buckets.size > 5000) for (const [k, v] of buckets) if (now >= v.reset) buckets.delete(k);
    buckets.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  b.n += 1;
  return b.n <= max;
}

/** IP del cliente segun el proxy de Vercel (primer valor de x-forwarded-for). */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
}
