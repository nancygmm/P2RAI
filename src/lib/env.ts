/**
 * Lee un numero de una variable de entorno. Un valor no numerico ("14 USD", "1,5") no debe
 * convertirse en NaN, porque `x >= NaN` siempre es falso y apagaria topes y limites.
 */
export function envNumber(name: string, fallback: number, min = 0): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min) {
    console.warn(`Variable ${name}="${raw}" no es un numero valido; se usa ${fallback}.`);
    return fallback;
  }
  return n;
}
