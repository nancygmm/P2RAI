import { NextResponse } from "next/server";
import { getCaller } from "@/lib/admin";
import { BudgetExceededError } from "@/lib/ai";
import { generateIllustration, ImageGenError, imageGenEnabled } from "@/lib/images";
import { allow } from "@/lib/rate-limit";

// La generacion tarda entre 10 y 40 s; 60 s cabe en cualquier plan de Vercel.
export const maxDuration = 60;

/** Genera una ilustracion con IA para una noticia. Solo administradores. */
export async function POST(req: Request) {
  const caller = await getCaller(req);
  if (!caller?.isAdmin) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  if (!imageGenEnabled()) {
    return NextResponse.json({ error: "La generación de imágenes no está configurada (falta OPENROUTER_API_KEY o AI_MOCK=1)." }, { status: 503 });
  }
  if (!allow(`imggen:${caller.uid}`, 5, 60_000)) {
    return NextResponse.json({ error: "Demasiadas generaciones seguidas. Espera un minuto." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt : "";
  try {
    const img = await generateIllustration(prompt, caller.uid);
    return NextResponse.json(img);
  } catch (e) {
    if (e instanceof BudgetExceededError) {
      return NextResponse.json({ error: "Se alcanzó el tope de presupuesto de IA: no se generan más imágenes." }, { status: 402 });
    }
    if (e instanceof ImageGenError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "No se pudo generar la imagen." }, { status: 500 });
  }
}
