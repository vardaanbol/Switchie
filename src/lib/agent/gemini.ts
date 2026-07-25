import { GoogleGenAI } from "@google/genai";
import { logGeminiCost } from "@/lib/agent/cost-log";

const CURRENT_MODEL = "gemini-3.6-flash";
const MODEL = process.env.GEMINI_MODEL ?? CURRENT_MODEL;

/** Tried in order when the primary model is overloaded / missing. */
const FALLBACK_MODELS = [
  CURRENT_MODEL,
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-latest",
];

const MAX_ATTEMPTS_PER_MODEL = 3;
const RETRYABLE_STATUS = new Set([429, 503, 504]);

let client: GoogleGenAI | null = null;

export function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

export function getGeminiModel() {
  return MODEL;
}

export function isGeminiOverloadedError(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (status != null && RETRYABLE_STATUS.has(status)) return true;
  const msg = error instanceof Error ? error.message : String(error);
  return /high demand|UNAVAILABLE|try again later|resource.?exhausted|503|429/i.test(
    msg
  );
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const e = error as {
    status?: number | string;
    code?: number | string;
    error?: { code?: number | string; status?: string };
  };
  const raw = e.status ?? e.code ?? e.error?.code;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string" && /^\d+$/.test(raw)) return Number(raw);

  const msg = error instanceof Error ? error.message : "";
  const match = msg.match(/"code"\s*:\s*(\d{3})/);
  if (match) return Number(match[1]);
  return undefined;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function modelCandidates(primary: string): string[] {
  const ordered = [primary, ...FALLBACK_MODELS.filter((m) => m !== primary)];
  return [...new Set(ordered)];
}

export async function generateJson<T>(opts: {
  label: string;
  prompt: string;
  system?: string;
  useSearch?: boolean;
  temperature?: number;
}): Promise<T> {
  const result = await generateGroundedJson<T>(opts);
  return result.data;
}

export type GroundingSource = {
  uri?: string;
  title?: string;
};

export async function generateGroundedJson<T>(opts: {
  label: string;
  prompt: string;
  system?: string;
  useSearch?: boolean;
  temperature?: number;
}): Promise<{ data: T; sources: GroundingSource[]; searchQueries: string[] }> {
  const ai = getGeminiClient();
  const started = Date.now();

  const generate = (model: string) =>
    ai.models.generateContent({
      model,
      contents: opts.prompt,
      config: {
        systemInstruction:
          opts.system ??
          "You are a careful assistant. Respond with valid JSON only. No markdown fences.",
        temperature: opts.temperature ?? 0.3,
        ...(opts.useSearch
          ? { tools: [{ googleSearch: {} }] }
          : { responseMimeType: "application/json" }),
      },
    });

  const models = modelCandidates(MODEL);
  let usedModel = models[0];
  let response: Awaited<ReturnType<typeof generate>> | undefined;
  let lastError: unknown;

  for (const model of models) {
    usedModel = model;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt++) {
      try {
        response = await generate(model);
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        const status = getErrorStatus(error);
        const overloaded = isGeminiOverloadedError(error);
        const missing = status === 404;

        if (missing) {
          console.warn(
            `[gemini] ${opts.label}: model ${model} not found; trying next`
          );
          break;
        }

        if (overloaded && attempt < MAX_ATTEMPTS_PER_MODEL) {
          const delayMs = 600 * 2 ** (attempt - 1) + Math.floor(Math.random() * 250);
          console.warn(
            `[gemini] ${opts.label}: ${model} busy (${status ?? "n/a"}); retry ${attempt}/${MAX_ATTEMPTS_PER_MODEL} in ${delayMs}ms`
          );
          await sleep(delayMs);
          continue;
        }

        if (overloaded) {
          console.warn(
            `[gemini] ${opts.label}: ${model} still busy; trying fallback model`
          );
          break;
        }

        throw error;
      }
    }

    if (response) break;
  }

  if (!response) {
    if (isGeminiOverloadedError(lastError)) {
      throw new Error(
        "Gemini is temporarily overloaded. Please try again in a moment."
      );
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("Gemini request failed");
  }

  const text = response.text ?? "";
  const usage = response.usageMetadata;
  const grounding = response.candidates?.[0]?.groundingMetadata;
  const sources: GroundingSource[] = (grounding?.groundingChunks ?? [])
    .map((chunk) => ({
      uri: chunk.web?.uri,
      title: chunk.web?.title,
    }))
    .filter((s) => s.uri || s.title);
  const searchQueries = grounding?.webSearchQueries ?? [];

  logGeminiCost({
    label: opts.label,
    model: usedModel,
    promptTokens: usage?.promptTokenCount,
    candidatesTokens: usage?.candidatesTokenCount,
    totalTokens: usage?.totalTokenCount,
    durationMs: Date.now() - started,
    grounded: Boolean(opts.useSearch),
  });

  if (opts.useSearch) {
    console.info(
      `[gemini-grounding] ${opts.label} queries=${JSON.stringify(searchQueries)} sources=${sources.length}`
    );
  }

  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return {
      data: JSON.parse(cleaned) as T,
      sources,
      searchQueries,
    };
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) {
      throw new Error(
        `Gemini (${opts.label}) returned non-JSON: ${cleaned.slice(0, 200)}`
      );
    }
    return {
      data: JSON.parse(match[0]) as T,
      sources,
      searchQueries,
    };
  }
}
