import { NextResponse } from "next/server";
import { getCaller } from "@/lib/admin";
import { BudgetExceededError } from "@/lib/ai";
import { generateIllustration, ImageGenError, imageGenEnabled } from "@/lib/images";
import { allow } from "@/lib/rate-limit";

// La generacion tarda entre 10 y 40 s; 60 s cabe en cualquier plan de Vercel.
export const maxDuration = 60;

/**
 * Genera una ilustracion con IA para una noticia. Cualquier usuario con sesion (publicar es abierto);
 * el tope global de presupuesto y los limites por usuario acotan el gasto.
 */
export async function POST(req: Request) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "Inicia sesión para generar imágenes" }, { status: 401 });
  if (!imageGenEnabled()) {
    return NextResponse.json({ error: "La generación de imágenes no está configurada (falta OPENROUTER_API_KEY o AI_MOCK=1)." }, { status: 503 });
  }
  if (!allow(`imggen:${caller.uid}`, 5, 60_000)) {
    return NextResponse.json({ error: "Demasiadas generaciones seguidas. Espera un minuto." }, { status: 429 });
  }
  // Sin rol admin, un tope por hora: una sola cuenta no puede agotar el presupuesto compartido.
  if (!caller.isAdmin && !allow(`imggen-h:${caller.uid}`, 15, 3_600_000)) {
    return NextResponse.json({ error: "Llegaste al máximo de ilustraciones por hora. Intenta más tarde o usa la búsqueda con licencia." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt : "";
  try {
    const img = await generateIllustration(prompt, caller.uid);
    // El costo solo se informa a administradores.
    return NextResponse.json(caller.isAdmin ? img : { ...img, usd: undefined });
  } catch (e) {
    if (e instanceof BudgetExceededError) {
      // A quien no es admin no se le habla de presupuesto ni de cobros.
      return NextResponse.json({
        error: caller.isAdmin
          ? "Se alcanzó el tope de presupuesto de IA: no se generan más imágenes."
          : "La generación de ilustraciones no está disponible por ahora. Usa la búsqueda con licencia.",
      }, { status: 402 });
    }
    if (e instanceof ImageGenError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "No se pudo generar la imagen." }, { status: 500 });
  }
}
