export function normalizeKey(title: string, company: string, location?: string) {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  return `${clean(title)}|${clean(company)}|${clean(location ?? "")}`;
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
