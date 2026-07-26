export function normalizeKey(title: string, company: string, location?: string) {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  return `${clean(title)}|${clean(company)}|${clean(location ?? "")}`;
}

/**
 * Limit how many listings a single employer contributes, preserving order.
 * Feed-based sources cluster many postings under one agency, which would
 * otherwise consume the whole enrichment budget.
 */
export function capPerCompany<T extends { company: string }>(
  items: T[],
  maxPerCompany: number
): T[] {
  const counts = new Map<string, number>();
  const out: T[] = [];
  for (const item of items) {
    const key = item.company.trim().toLowerCase();
    const seen = counts.get(key) ?? 0;
    if (seen >= maxPerCompany) continue;
    counts.set(key, seen + 1);
    out.push(item);
  }
  return out;
}

export function dedupeByTitleCompanyLocation<
  T extends { title: string; company: string; location?: string; sourceUrl: string },
>(items: T[]): T[] {
  const seen = new Map<string, T>();
  for (const item of items) {
    const key = normalizeKey(item.title, item.company, item.location);
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }
  return [...seen.values()];
}
