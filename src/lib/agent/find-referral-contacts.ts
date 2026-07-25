import { generateJson } from "@/lib/agent/gemini";

export type ReferralContactResult = {
  name: string;
  title: string;
  company: string;
  profileUrl: string;
  confidence: number;
};

export async function findReferralContacts(opts: {
  company: string;
  roleTitle: string;
}): Promise<ReferralContactResult[]> {
  const result = await generateJson<{ contacts: ReferralContactResult[] }>({
    label: "findReferralContacts",
    useSearch: true,
    prompt: `Find publicly visible professional profiles of people who currently work at "${opts.company}" in roles adjacent to "${opts.roleTitle}".

IMPORTANT RULES:
- Use only public web search results (Google, Bing, public directories, company about pages).
- Do NOT scrape LinkedIn directly or invent profile URLs.
- Only include a profileUrl if it appeared in search results as a public URL.
- Prefer LinkedIn public profile URLs when they appear in search snippets; otherwise other public profile pages are fine.

Return JSON:
{
  "contacts": [{
    "name": string,
    "title": string,
    "company": string,
    "profileUrl": string,
    "confidence": number between 0 and 1
  }]
}
Return at most 2 contacts. If none found confidently, return { "contacts": [] }.`,
  });

  return (result.contacts ?? [])
    .filter((c) => c.name && c.profileUrl && c.profileUrl.startsWith("http"))
    .map((c) => ({
      ...c,
      company: c.company || opts.company,
      confidence: Math.max(0, Math.min(1, c.confidence ?? 0.5)),
    }))
    .slice(0, 2);
}
