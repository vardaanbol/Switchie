import { GoogleGenAI } from "@google/genai";
import { logGeminiCost } from "@/lib/agent/cost-log";

const CURRENT_MODEL = "gemini-3.6-flash";
const MODEL = process.env.GEMINI_MODEL ?? CURRENT_MODEL;

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

export async function generateJson<T>(opts: {
  label: string;
  prompt: string;
  system?: string;
  useSearch?: boolean;
}): Promise<T> {
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
        temperature: 0.3,
        ...(opts.useSearch
          ? { tools: [{ googleSearch: {} }] }
          : { responseMimeType: "application/json" }),
      },
    });

  let usedModel = MODEL;
  let response;

  try {
    response = await generate(usedModel);
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status !== 404 || usedModel === CURRENT_MODEL) {
      throw error;
    }

    console.warn(
      `[gemini] Model ${usedModel} unavailable; retrying with ${CURRENT_MODEL}`
    );
    usedModel = CURRENT_MODEL;
    response = await generate(usedModel);
  }

  const text = response.text ?? "";
  const usage = response.usageMetadata;

  logGeminiCost({
    label: opts.label,
    model: usedModel,
    promptTokens: usage?.promptTokenCount,
    candidatesTokens: usage?.candidatesTokenCount,
    totalTokens: usage?.totalTokenCount,
    durationMs: Date.now() - started,
    grounded: Boolean(opts.useSearch),
  });

  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) {
      throw new Error(`Gemini (${opts.label}) returned non-JSON: ${cleaned.slice(0, 200)}`);
    }
    return JSON.parse(match[0]) as T;
  }
}
