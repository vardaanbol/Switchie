import { GoogleGenAI } from "@google/genai";
import { logGeminiCost } from "@/lib/agent/cost-log";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

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

  const response = await ai.models.generateContent({
    model: MODEL,
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

  const text = response.text ?? "";
  const usage = response.usageMetadata;

  logGeminiCost({
    label: opts.label,
    model: MODEL,
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
