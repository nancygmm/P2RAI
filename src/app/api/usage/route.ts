import { NextResponse } from "next/server";
import { getCaller } from "@/lib/admin";
import { aiEnabled, BUDGET_CAP, BUDGET_TOTAL, getBudget } from "@/lib/ai";
import { IMAGE_ESTIMATE_USD, imageGenStatus, imageModel } from "@/lib/images";
import { allow, clientIp } from "@/lib/rate-limit";

export async function GET(req: Request) {
  if (!allow(`usage:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });
  // Sin rol admin: solo si se pueden generar ilustraciones (sin cifras de gasto).
  if (!caller.isAdmin) {
    return NextResponse.json({ imageGen: { enabled: imageGenStatus() === "ok", status: imageGenStatus(), model: imageModel() } });
  }
  const b = await getBudget();
  return NextResponse.json({
    spent: b.usd, calls: b.calls, byFeature: b.byFeature,
    total: BUDGET_TOTAL, cap: BUDGET_CAP, remaining: BUDGET_TOTAL - b.usd,
    aiEnabled: aiEnabled(), demo: caller.demo,
    imageGen: { enabled: imageGenStatus() === "ok", status: imageGenStatus(), model: imageModel(), estimateUsd: IMAGE_ESTIMATE_USD },
  });
}
