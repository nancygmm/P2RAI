import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import sharp from "sharp";
import { adminDb } from "./admin";
import { assertBudget, recordCost } from "./ai";
import { envNumber } from "./env";

/* ------------------------------------------------------------------ */
/* Busqueda de imagenes con licencia libre (Openverse: gratis, sin llave) */
/* ------------------------------------------------------------------ */

export interface LicensedImage {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  creator: string;
  license: string;
  licenseUrl: string;
  landingUrl: string;
  provider: string;
}

const searchCache = new Map<string, { exp: number; items: LicensedImage[] }>();

export async function searchLicensed(query: string): Promise<LicensedImage[]> {
  const q = query.trim().slice(0, 120);
  if (!q) return [];
  const key = q.toLowerCase();
  const hit = searchCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.items;

  // Sin licencias ND (sin derivadas): el feed recorta la imagen y le superpone un sello.
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=12&mature=false&license=by,by-sa,by-nc,by-nc-sa,cc0,pdm`;
  const res = await fetch(url, {
    headers: { "user-agent": "p2rai-news/1.0 (proyecto del curso Responsible AI)" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Openverse ${res.status}`);
  const data = (await res.json()) as { results?: Record<string, unknown>[] };
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const items = (data.results ?? [])
    .map((r) => {
      const license = [s(r.license).toUpperCase(), s(r.license_version)].filter(Boolean).join(" ");
      return {
        id: s(r.id),
        title: s(r.title).slice(0, 140),
        url: s(r.url),
        thumbnail: s(r.thumbnail),
        creator: s(r.creator) || "Autor desconocido",
        license: license.startsWith("CC") || license.startsWith("PDM") ? license : `CC ${license}`,
        licenseUrl: s(r.license_url),
        landingUrl: s(r.foreign_landing_url),
        provider: s(r.source) || s(r.provider),
      };
    })
    // Solo enlaces https directos (evita contenido mixto y esquemas raros).
    .filter((i) => i.id && i.url.startsWith("https://") && (!i.thumbnail || i.thumbnail.startsWith("https://")));

  if (searchCache.size > 200) searchCache.clear();
  searchCache.set(key, { exp: Date.now() + 10 * 60_000, items });
  return items;
}

/* ------------------------------------------------------------------ */
/* Generacion de ilustraciones con IA (OpenRouter Images, llave aparte) */
/* ------------------------------------------------------------------ */

// Modelo mas barato que cumple: gpt-image-1-mini en calidad baja (~USD 0.005 por imagen).
// Alternativa con mejor estilo de ilustracion y precio parecido: recraft/recraft-v4.1-flash.
const IMAGE_MODEL = process.env.OPENROUTER_IMAGE_MODEL || "openai/gpt-image-1-mini";
/**
 * Estimado por imagen que se muestra en el portal. El gasto que se registra es el costo real que
 * devuelve OpenRouter (usage.cost); este valor solo se usa si la respuesta no lo trae.
 */
export const IMAGE_ESTIMATE_USD = envNumber("AI_IMAGE_ESTIMATE_USD", 0.005);

export function imageGenEnabled(): boolean {
  return imageGenStatus() === "ok";
}
/** Por que la generacion esta (o no) disponible, para mostrar un mensaje correcto en el portal. */
export function imageGenStatus(): "ok" | "sin_llave" | "modo_simulado" {
  if (process.env.AI_MOCK === "1") return "modo_simulado";
  return process.env.OPENROUTER_API_KEY ? "ok" : "sin_llave";
}
export const imageModel = () => IMAGE_MODEL;

/**
 * Instrucciones fijas que el portal no puede quitar: la imagen debe verse como ilustracion,
 * nunca como foto del hecho, y no debe representar a personas reales.
 */
const STYLE_GUARD =
  "Ilustración editorial para acompañar una noticia. Estilo de ilustración plana o acuarela, con formas simples y " +
  "colores sobrios: debe verse claramente como un dibujo, NUNCA como una fotografía ni como una escena realista. " +
  "Sin texto, letras, logotipos ni marcas de agua. Sin personas reales identificables ni rostros detallados. " +
  "Sin violencia explícita, sangre ni víctimas. Representa el tema de forma simbólica.";

const STYLE_REMINDER =
  "Recuerda: ilustración claramente dibujada, no fotográfica, sin personas reales identificables ni texto.";

// Pedidos que buscan saltarse el estilo de ilustración. El portal es solo para admins, pero la
// promesa "no es una foto" se cumple en el servidor, no solo en el texto del portal.
const BYPASS = /(fotorrealis|foto ?realista|photorealis|realistic photo|fotograf[ií]a real|foto real|hiperrealis|hyperrealis|ignora (las |todas las )?instrucciones|ignore (all |the )?(previous|above))/i;

export class ImageGenError extends Error {}

// Formatos de entrada aceptados. SVG queda fuera: puede llevar scripts.
const RASTER = new Set(["png", "jpeg", "webp"]);
/** Firestore admite documentos de hasta 1 MiB; la imagen se guarda como bytes. */
const MAX_BYTES = 900_000;

/**
 * El proveedor no siempre respeta formato y calidad (puede devolver un PNG de varios MB).
 * Se normaliza aqui: maximo 1280 px y WebP comprimido, que ademas pesa menos para el feed.
 */
async function compress(raw: Buffer): Promise<Buffer> {
  let meta;
  try {
    meta = await sharp(raw).metadata();
  } catch {
    throw new ImageGenError("El proveedor devolvió un archivo que no es una imagen válida.");
  }
  if (!meta.format || !RASTER.has(meta.format)) {
    throw new ImageGenError(`El proveedor devolvió un formato no admitido (${meta.format ?? "desconocido"}).`);
  }
  for (const [width, quality] of [[1280, 75], [1024, 60], [800, 50]] as const) {
    const out = await sharp(raw)
      .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
    if (out.length <= MAX_BYTES) return out;
  }
  throw new ImageGenError("La imagen generada es demasiado grande para guardarla. Intenta de nuevo.");
}

// Imagenes generadas en modo demo (sin Firestore): solo en memoria.
const memImages = new Map<string, { data: Buffer; contentType: string }>();

export interface GeneratedImage { id: string; url: string; model: string; usd: number; prompt: string }

export async function generateIllustration(userPrompt: string, uid: string): Promise<GeneratedImage> {
  const prompt = userPrompt.trim().slice(0, 800);
  if (prompt.length < 10) throw new ImageGenError("Describe la imagen con al menos 10 caracteres.");
  if (BYPASS.test(prompt)) {
    throw new ImageGenError("La descripción pide una imagen realista o anula el estilo: solo se generan ilustraciones que no parezcan fotos.");
  }
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new ImageGenError("La generación de imágenes no está configurada (falta OPENROUTER_API_KEY).");
  await assertBudget();

  // API de imagenes de OpenRouter (forma compatible con la de OpenAI).
  const res = await fetch("https://openrouter.ai/api/v1/images", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      "x-title": "P2RAI Noticias",
    },
    signal: AbortSignal.timeout(55_000),
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt: `${STYLE_GUARD}\n\nTema: ${prompt}\n\n${STYLE_REMINDER}`,
      // Los modelos de OpenAI aceptan tamano exacto; el resto, proporcion.
      ...(IMAGE_MODEL.startsWith("openai/") ? { size: "1536x1024" } : { aspect_ratio: "3:2" }),
      quality: "low",
      output_format: "webp",
      n: 1,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Error OpenRouter Images:", res.status, text.slice(0, 300));
    if (res.status === 401) throw new ImageGenError("La llave de OpenRouter no es válida (revisa OPENROUTER_API_KEY).");
    if (res.status === 402) throw new ImageGenError("La llave de OpenRouter se quedó sin crédito o llegó a su límite de gasto.");
    if (res.status === 429) throw new ImageGenError("OpenRouter limitó las solicitudes. Espera un momento e intenta de nuevo.");
    if (/moderation|safety|flagged/i.test(text)) {
      throw new ImageGenError("El proveedor rechazó la descripción por sus políticas de contenido. Reformúlala.");
    }
    throw new ImageGenError(`No se pudo generar la imagen (el proveedor respondió ${res.status}).`);
  }

  const data = (await res.json()) as {
    data?: { b64_json?: string; media_type?: string }[];
    usage?: { cost?: number; prompt_tokens?: number; completion_tokens?: number };
  };
  // OpenRouter devuelve el costo real en USD; si no viene, se registra el estimado.
  const cost = Number(data.usage?.cost);
  const usd = Number.isFinite(cost) && cost >= 0 ? cost : IMAGE_ESTIMATE_USD;
  await recordCost({
    feature: "imagen", uid, provider: "openrouter", model: IMAGE_MODEL,
    tokensIn: data.usage?.prompt_tokens ?? 0, tokensOut: data.usage?.completion_tokens ?? 0, usd,
  });

  const first = data.data?.[0];
  const b64 = first?.b64_json?.replace(/^data:[^,]*,/, "");
  if (!b64) throw new ImageGenError("El proveedor no devolvió ninguna imagen.");
  if (first?.media_type && /svg/i.test(first.media_type)) {
    throw new ImageGenError(`El proveedor devolvió un formato no admitido (${first.media_type}).`);
  }
  const raw = Buffer.from(b64, "base64");
  const bytes = await compress(raw);
  const contentType = "image/webp";
  console.log(`Imagen ${IMAGE_MODEL}: ${first?.media_type ?? "?"} ${raw.length} B -> webp ${bytes.length} B · USD ${usd}`);

  const db = adminDb();
  let id: string;
  if (db) {
    const ref = await db.collection("images").add({
      data: bytes, contentType, bytes: bytes.length,
      prompt, model: IMAGE_MODEL, createdBy: uid, createdAt: Date.now(), usd,
    });
    id = ref.id;
  } else {
    id = randomBytes(10).toString("hex");
    memImages.set(id, { data: bytes, contentType });
  }
  return { id, url: imagePath(id), model: IMAGE_MODEL, usd, prompt };
}

/*
 * URLs firmadas: /api/images/<id>.<firma>. La ruta es publica (va en <img>), pero sin una firma
 * valida responde 404 sin tocar Firestore: nadie puede gastar lecturas probando ids inventados.
 */
function signingKey(): string {
  const explicit = process.env.IMAGE_URL_SECRET;
  if (explicit) return explicit;
  // Por defecto se deriva de la cuenta de servicio (secreta y presente en el servidor).
  return createHash("sha256").update(`p2rai-img:${process.env.FIREBASE_SERVICE_ACCOUNT ?? "demo-local"}`).digest("hex");
}
function signature(id: string): string {
  return createHmac("sha256", signingKey()).update(id).digest("base64url").slice(0, 16);
}
export function imagePath(id: string): string {
  return `/api/images/${id}.${signature(id)}`;
}
/** Forma de una URL de imagen generada por la app (la firma se valida en el servidor). */
export const IMAGE_PATH = /^\/api\/images\/[A-Za-z0-9]{20}\.[A-Za-z0-9_-]{16}$/;

/** Devuelve el id si el segmento "<id>.<firma>" es valido; null si no (sin leer Firestore). */
export function verifyImageRef(ref: string): string | null {
  const m = /^([A-Za-z0-9]{20})\.([A-Za-z0-9_-]{16})$/.exec(ref);
  if (!m) return null;
  const a = Buffer.from(m[2]), b = Buffer.from(signature(m[1]));
  return a.length === b.length && timingSafeEqual(a, b) ? m[1] : null;
}

// Copia en memoria de imagenes servidas (hasta ~25 MB) para no releer Firestore en cada lector.
const served = new Map<string, { data: Buffer; contentType: string }>();
let servedBytes = 0;

export async function readImage(id: string): Promise<{ data: Buffer; contentType: string } | null> {
  const db = adminDb();
  if (!db) return memImages.get(id) ?? null;
  const hit = served.get(id);
  if (hit) return hit;
  const snap = await db.doc(`images/${id}`).get();
  const data = snap.get("data");
  if (!snap.exists || !data) return null;
  const img = { data: Buffer.isBuffer(data) ? data : Buffer.from(data as Uint8Array), contentType: snap.get("contentType") ?? "image/webp" };
  if (servedBytes + img.data.length > 25_000_000) { served.clear(); servedBytes = 0; }
  served.set(id, img);
  servedBytes += img.data.length;
  return img;
}
