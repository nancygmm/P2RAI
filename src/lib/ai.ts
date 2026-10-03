import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";

/**
 * UNICO punto de entrada a la IA. Todo pasa por aqui para que el tope de gasto
 * y el registro de costos no se puedan saltar. Cambiar de proveedor = tocar este archivo.
 */
const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";
const PRICE_IN = Number(process.env.AI_PRICE_IN ?? 0.2); // USD por 1M tokens
const PRICE_OUT = Number(process.env.AI_PRICE_OUT ?? 1.2);
export const BUDGET_TOTAL = 20;
export const BUDGET_CAP = Number(process.env.AI_BUDGET_CAP_USD ?? 14);

export function aiEnabled(): boolean {
  return !!process.env.OPENAI_API_KEY && process.env.AI_MOCK !== "1";
}

export class BudgetExceededError extends Error {
  constructor() { super("Tope de presupuesto de IA alcanzado"); }
}

// En modo demo (sin Firestore) el gasto vive en memoria del proceso.
const mem = { usd: 0, calls: 0, byFeature: {} as Record<string, { usd: number; calls: number }> };

export interface Budget { usd: number; calls: number; byFeature: Record<string, { usd: number; calls: number }> }

export async function getBudget(): Promise<Budget> {
  const db = adminDb();
  if (!db) return mem;
  const snap = await db.doc("meta/budget").get();
  return { usd: snap.get("usd") ?? 0, calls: snap.get("calls") ?? 0, byFeature: snap.get("byFeature") ?? {} };
}

async function record(feature: string, uid: string, tokensIn: number, tokensOut: number) {
  const usd = (tokensIn * PRICE_IN + tokensOut * PRICE_OUT) / 1_000_000;
  const db = adminDb();
  if (!db) {
    mem.usd += usd; mem.calls += 1;
    const f = (mem.byFeature[feature] ??= { usd: 0, calls: 0 });
    f.usd += usd; f.calls += 1;
    return usd;
  }
  const batch = db.batch();
  batch.set(db.collection("aiUsage").doc(), { feature, uid, model: MODEL, tokensIn, tokensOut, usd, ts: Date.now() });
  batch.set(db.doc("meta/budget"), {
    usd: FieldValue.increment(usd),
    calls: FieldValue.increment(1),
    byFeature: { [feature]: { usd: FieldValue.increment(usd), calls: FieldValue.increment(1) } },
  }, { merge: true });
  await batch.commit();
  return usd;
}

export interface JsonCall {
  feature: string;
  uid: string;
  system: string;
  prompt: string;
  /** JSON Schema estricto de la respuesta. */
  schema: Record<string, unknown>;
  maxOutputTokens?: number;
}

/** Llama al modelo y devuelve JSON validado por esquema. Lanza BudgetExceededError si se alcanzo el tope. */
export async function generateJson<T>(call: JsonCall): Promise<T> {
  if ((await getBudget()).usd >= BUDGET_CAP) throw new BudgetExceededError();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: call.system },
        { role: "user", content: call.prompt },
      ],
      response_format: { type: "json_schema", json_schema: { name: call.feature, strict: true, schema: call.schema } },
      max_completion_tokens: call.maxOutputTokens ?? 600,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  // completion_tokens ya incluye los tokens de razonamiento, que se cobran como salida.
  await record(call.feature, call.uid, data.usage?.prompt_tokens ?? 0, data.usage?.completion_tokens ?? 0);
  return JSON.parse(data.choices?.[0]?.message?.content ?? "{}") as T;
}
