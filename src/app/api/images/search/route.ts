import { NextResponse } from "next/server";
import { getCaller } from "@/lib/admin";
import { searchLicensed } from "@/lib/images";
import { allow } from "@/lib/rate-limit";

/** Busca imagenes con licencia libre en Openverse (gratis, sin llave). Solo administradores. */
export async function GET(req: Request) {
  const caller = await getCaller(req);
  if (!caller?.isAdmin) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  if (!allow(`imgsearch:${caller.uid}`, 20, 60_000)) {
    return NextResponse.json({ error: "Demasiadas búsquedas seguidas. Espera un minuto." }, { status: 429 });
  }
  const q = new URL(req.url).searchParams.get("q") ?? "";
  try {
    return NextResponse.json({ results: await searchLicensed(q) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "No se pudo consultar Openverse. Intenta de nuevo o pega una URL." }, { status: 502 });
  }
}
