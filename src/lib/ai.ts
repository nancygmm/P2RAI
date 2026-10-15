import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { envNumber } from "./env";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
const PRICE_IN = envNumber("AI_PRICE_IN", 1);
const PRICE_OUT = envNumber("AI_PRICE_OUT", 5);

export const BUDGET_TOTAL = 20;
export const BUDGET_CAP = envNumber("AI_BUDGET_CAP_USD", 14);

export function aiEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY && process.env.AI_MOCK !== "1";
}

export class BudgetExceededError extends Error {
  constructor() {
    super("Tope de presupuesto de IA alcanzado");
  }
}

/** El modelo llego a max_tokens: el JSON quedo cortado (la llamada ya se cobro y se registro). */
export class TruncatedError extends Error {
  constructor() {
    super("La respuesta del modelo se cortó por longitud");
  }
}

const mem = {
  usd: 0,
  calls: 0,
  byFeature: {} as Record<string, { usd: number; calls: number }>,
};

export interface Budget {
  usd: number;
  calls: number;
  byFeature: Record<string, { usd: number; calls: number }>;
}

export async function getBudget(): Promise<Budget> {
  const db = adminDb();

  if (!db) {
    return mem;
  }

  const snap = await db.doc("meta/budget").get();
  const usd = Number(snap.get("usd") ?? 0);

  return {
    usd: Number.isFinite(usd) ? usd : 0,
    calls: snap.get("calls") ?? 0,
    byFeature: snap.get("byFeature") ?? {},
  };
}

/** Lanza BudgetExceededError si el gasto registrado ya alcanzo el tope. */
export async function assertBudget(): Promise<void> {
  const budget = await getBudget();
  if (budget.usd >= BUDGET_CAP) throw new BudgetExceededError();
}

export interface CostEntry {
  feature: string;
  uid: string;
  provider: string;
  model: string;
  usd: number;
  tokensIn?: number;
  tokensOut?: number;
}

/** Registra un gasto de IA (chat, imagen...) en el historial y en el acumulado del presupuesto. */
export async function recordCost(entry: CostEntry): Promise<number> {
  const usd = Number.isFinite(entry.usd) && entry.usd > 0 ? entry.usd : 0;
  const db = adminDb();

  if (!db) {
    mem.usd += usd;
    mem.calls += 1;

    const featureData = (mem.byFeature[entry.feature] ??= {
      usd: 0,
      calls: 0,
    });

    featureData.usd += usd;
    featureData.calls += 1;

    return usd;
  }

  const batch = db.batch();

  batch.set(db.collection("aiUsage").doc(), {
    feature: entry.feature,
    uid: entry.uid,
    provider: entry.provider,
    model: entry.model,
    tokensIn: entry.tokensIn ?? 0,
    tokensOut: entry.tokensOut ?? 0,
    usd,
    ts: Date.now(),
  });

  batch.set(
    db.doc("meta/budget"),
    {
      usd: FieldValue.increment(usd),
      calls: FieldValue.increment(1),
      byFeature: {
        [entry.feature]: {
          usd: FieldValue.increment(usd),
          calls: FieldValue.increment(1),
        },
      },
    },
    { merge: true }
  );

  await batch.commit();

  return usd;
}

export interface JsonCall {
  feature: string;
  uid: string;
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  maxOutputTokens?: number;
}

type ClaudeResponse = {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
  stop_reason?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
};

export async function generateJson<T>(call: JsonCall): Promise<T> {
  await assertBudget();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;

  if (!apiKey) {
    throw new Error("Falta ANTHROPIC_API_KEY");
  }

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };

  if (workspaceId) {
    headers["anthropic-workspace-id"] = workspaceId;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: call.maxOutputTokens ?? 300,
      system: call.system,
      messages: [
        {
          role: "user",
          content: call.prompt,
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: call.schema,
        },
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();

    console.error("Error Anthropic:", res.status, errorText.slice(0, 300));

    throw new Error(`Anthropic ${res.status}`);
  }

  const data = (await res.json()) as ClaudeResponse;

  const tokensIn = data.usage?.input_tokens ?? 0;
  const tokensOut = data.usage?.output_tokens ?? 0;

  console.log(`IA ${call.feature}: ${MODEL} · ${tokensIn} in / ${tokensOut} out · stop=${data.stop_reason}`);

  await recordCost({
    feature: call.feature,
    uid: call.uid,
    provider: "anthropic",
    model: MODEL,
    tokensIn,
    tokensOut,
    usd: (tokensIn * PRICE_IN + tokensOut * PRICE_OUT) / 1_000_000,
  });

  if (data.stop_reason === "max_tokens") {
    throw new TruncatedError();
  }

  const text =
    data.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("") ?? "";

  if (!text.trim()) {
    throw new Error("Claude devolvió una respuesta vacía");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    console.error("Claude devolvió JSON inválido (", text.length, "caracteres)");
    throw new Error("Claude devolvió JSON inválido");
  }
}
