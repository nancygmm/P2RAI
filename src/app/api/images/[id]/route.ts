import { readImage, verifyImageRef } from "@/lib/images";
import { allow, clientIp } from "@/lib/rate-limit";

/**
 * Sirve una imagen generada (guardada en Firestore). Es publica para que funcione en <img>,
 * pero la URL va firmada: sin firma valida se responde 404 sin leer Firestore. El contenido
 * nunca cambia, asi que el CDN de Vercel (s-maxage) y el navegador la cachean para siempre.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: ref } = await params;
  const id = verifyImageRef(ref);
  if (!id) return new Response("No encontrada", { status: 404 });
  if (!allow(`img:${clientIp(req)}`, 60, 60_000)) return new Response("Demasiadas solicitudes", { status: 429 });
  const img = await readImage(id);
  if (!img) return new Response("No encontrada", { status: 404, headers: { "cache-control": "public, max-age=60, s-maxage=3600" } });
  return new Response(new Uint8Array(img.data), {
    headers: {
      "content-type": img.contentType,
      "cache-control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
