import { NextResponse } from "next/server";
import { getCaller } from "@/lib/admin";
import { aiEnabled, BUDGET_CAP, BUDGET_TOTAL, getBudget } from "@/lib/ai";

export async function GET(req: Request) {
  const caller = await getCaller(req);
  if (!caller?.isAdmin) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  const b = await getBudget();
  return NextResponse.json({
    spent: b.usd, calls: b.calls, byFeature: b.byFeature,
    total: BUDGET_TOTAL, cap: BUDGET_CAP, remaining: BUDGET_TOTAL - b.usd,
    aiEnabled: aiEnabled(), demo: caller.demo,
  });
}
