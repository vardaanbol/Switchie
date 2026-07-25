export type GeminiCostEntry = {
  at: string;
  label: string;
  model: string;
  promptTokens?: number;
  candidatesTokens?: number;
  totalTokens?: number;
  durationMs: number;
  grounded: boolean;
};

const globalForCost = globalThis as typeof globalThis & {
  __geminiCostLog?: GeminiCostEntry[];
};

function store() {
  if (!globalForCost.__geminiCostLog) {
    globalForCost.__geminiCostLog = [];
  }
  return globalForCost.__geminiCostLog;
}

export function logGeminiCost(entry: Omit<GeminiCostEntry, "at">) {
  const full: GeminiCostEntry = { ...entry, at: new Date().toISOString() };
  store().push(full);
  // Keep last 200 entries in memory for debugging
  if (store().length > 200) store().shift();
  console.info(
    `[gemini-cost] ${full.label} model=${full.model} tokens=${full.totalTokens ?? "?"} ms=${full.durationMs} grounded=${full.grounded}`
  );
}

export function getGeminiCostLog() {
  return [...store()];
}
