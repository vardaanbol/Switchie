import {
  generateGroundedJson,
  type GroundingSource,
} from "@/lib/agent/gemini";

export type ReferralContactResult = {
  name: string;
  title: string;
  company: string;
  profileUrl: string;
  confidence: number;
  currentlyAtCompany: boolean;
};

type DiscoveryContact = {
  name?: string;
  title?: string;
  company?: string;
  profileUrl?: string;
  confidence?: number;
  currentlyAtCompany?: boolean;
  evidence?: string;
  whyUseful?: string;
};

type ResolvePayload = {
  profileUrl?: string | null;
  found?: boolean;
  evidence?: string;
};

type VerifyPayload = {
  verdicts?: Array<{
    profileUrl?: string;
    name?: string;
    verifiedCurrent?: boolean;
    profileExists?: boolean;
    currentTitle?: string;
    currentCompany?: string;
    confidence?: number;
    evidence?: string;
  }>;
};

/** Strip legal suffixes / noise so search matches LinkedIn better. */
export function cleanCompanyName(raw: string): string {
  return raw
    .replace(/\s*[|–—-]\s*.*$/, "")
    .replace(
      /\b(pvt\.?|private|ltd\.?|limited|inc\.?|llc|llp|corp\.?|corporation|technologies|technology|solutions|labs?|india)\b/gi,
      " "
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

function peerHints(roleTitle: string): string[] {
  const t = roleTitle.toLowerCase();
  const hints = new Set<string>();

  if (/recruit|talent|people|hr\b/.test(t)) {
    hints.add("recruiter").add("talent acquisition").add("people partner");
  } else if (/design|ux|ui|product design/.test(t)) {
    hints.add("design manager").add("product designer").add("head of design");
  } else if (/data|ml|machine learning|ai\b|analyst/.test(t)) {
    hints.add("data scientist").add("ml engineer").add("analytics manager");
  } else if (/product\b/.test(t)) {
    hints.add("product manager").add("group product manager").add("head of product");
  } else if (/market|growth|brand/.test(t)) {
    hints.add("marketing manager").add("growth").add("brand");
  } else if (/sales|account executive|bd\b|business development/.test(t)) {
    hints.add("account executive").add("sales manager").add("business development");
  } else {
    hints
      .add("software engineer")
      .add("engineering manager")
      .add("tech lead")
      .add("hiring manager")
      .add("recruiter")
      .add("talent acquisition");
  }

  hints.add("recruiter");
  hints.add("engineering manager");
  return [...hints].slice(0, 6);
}

export function normalizeLinkedInProfileUrl(raw: string): string | null {
  try {
    let input = raw.trim();
    const embedded = input.match(
      /https?:\/\/(?:[a-z]+\.)?linkedin\.com\/in\/[^\s"'<>]+/i
    );
    if (embedded) input = embedded[0].replace(/[.,;:)]+$/, "");

    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    // linkedin.com or localized hosts like in.linkedin.com
    if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) return null;

    const match = url.pathname.match(/^\/in\/([^/?#]+)\/?/i);
    if (!match?.[1]) return null;

    let handle = decodeURIComponent(match[1]).replace(/\/+$/, "");
    // Undo double-encoding
    try {
      if (/%[0-9a-f]{2}/i.test(handle)) handle = decodeURIComponent(handle);
    } catch {
      /* keep */
    }
    if (!handle || handle.length < 3) return null;
    if (/^(pub|dir|company|school|jobs|in|me|preload)$/i.test(handle)) return null;
    // Real handles are mostly slug-like
    if (!/^[a-zA-Z0-9][a-zA-Z0-9\-_.]{1,100}$/.test(handle)) return null;

    return `https://www.linkedin.com/in/${handle}`;
  } catch {
    return null;
  }
}

/** Pull every linkedin.com/in/… URL mentioned in grounding + model text. */
export function extractLinkedInUrlsFromGrounding(
  sources: GroundingSource[],
  extraText = ""
): Set<string> {
  const found = new Set<string>();
  const blobs: string[] = [extraText];

  for (const source of sources) {
    if (source.uri) {
      blobs.push(source.uri);
      try {
        blobs.push(decodeURIComponent(source.uri));
      } catch {
        /* ignore */
      }
    }
    if (source.title) blobs.push(source.title);
  }

  const haystack = blobs.join("\n");
  const matches = haystack.match(
    /https?:\/\/(?:[a-z]+\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_.%]+\/?/gi
  );
  for (const m of matches ?? []) {
    const normalized = normalizeLinkedInProfileUrl(m);
    if (normalized) found.add(normalized);
  }

  // Titles sometimes look like: "Jane Doe - Engineer - Acme | LinkedIn"
  // without a full URL — can't invent handles from those.
  return found;
}

function looksFormer(blob: string): boolean {
  return /\b(former|ex[- ]|previously|alumni|alumnus|ex[- ]?employee|left |was at|used to work|past experience)\b/i.test(
    blob
  );
}

function companyMentioned(
  evidence: string,
  company: string,
  cleaned: string
): boolean {
  const e = evidence.toLowerCase();
  const variants = [company, cleaned]
    .map((c) => c.toLowerCase())
    .filter(Boolean);
  return variants.some((v) => v.length >= 2 && e.includes(v));
}

/**
 * Probe the profile page. LinkedIn often returns 200 even for missing profiles,
 * with "This page doesn't exist" in the HTML — that's what we catch.
 */
export async function linkedInProfileExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(10_000),
    });

    const text = (await res.text()).slice(0, 80_000);

    if (
      /This page doesn'?t exist|page not found|profile not found|we couldn'?t find that page|doesn'?t exist/i.test(
        text
      )
    ) {
      return false;
    }

    // Hard 404
    if (res.status === 404) return false;

    // Bot blocks / auth walls for real profiles — don't reject
    if (res.status === 999 || res.status === 429 || res.status === 403) {
      return true;
    }

    if (res.status >= 400) return false;

    // A live profile / auth interstitial still mentions linkedin + the handle often
    return /linkedin/i.test(text);
  } catch (err) {
    console.warn("[referrals] profile probe failed", url, err);
    // Fail closed — better empty than a 404 link
    return false;
  }
}

async function discoverPeople(opts: {
  company: string;
  cleanedCompany: string;
  roleTitle: string;
}): Promise<{
  contacts: DiscoveryContact[];
  groundedUrls: Set<string>;
}> {
  const hints = peerHints(opts.roleTitle).join(", ");
  const searchCompany =
    opts.cleanedCompany.length >= 2 ? opts.cleanedCompany : opts.company;

  const { data, searchQueries, sources } = await generateGroundedJson<{
    contacts?: DiscoveryContact[];
  }>({
    label: "findReferralContacts.discover",
    useSearch: true,
    temperature: 0.15,
    system: `You research referral contacts with Google Search. Never invent LinkedIn URLs. Only copy profile URLs that appear in search results. JSON only.`,
    prompt: `Find people who CURRENTLY work at "${opts.company}" (search also as "${searchCompany}") who could refer a candidate for "${opts.roleTitle}".

Required Google searches:
1) site:linkedin.com/in "${searchCompany}" (${hints})
2) site:linkedin.com/in "${searchCompany}" (recruiter OR "talent acquisition" OR "hiring manager")
3) "${searchCompany}" "linkedin.com/in" India

For each person, copy the EXACT LinkedIn profile URL from the search result (must look like https://www.linkedin.com/in/some-handle).
If you cannot see a real /in/ URL in results for someone, OMIT them — do not guess the handle.

Prefer recruiters, then hiring managers / eng managers, then peers.

JSON:
{
  "contacts": [{
    "name": string,
    "title": string,
    "company": "${opts.company}",
    "profileUrl": "https://www.linkedin.com/in/exact-handle-from-results",
    "confidence": 0-1,
    "currentlyAtCompany": true,
    "evidence": "snippet that includes company + title",
    "whyUseful": "recruiter | hiring manager | peer"
  }]
}
Return [] if nothing solid.`,
  });

  const groundedUrls = extractLinkedInUrlsFromGrounding(
    sources,
    JSON.stringify(data)
  );

  console.info(
    `[referrals] discover company="${opts.company}" queries=${JSON.stringify(searchQueries)} groundedLinkedIn=${groundedUrls.size} raw=${data.contacts?.length ?? 0}`
  );

  return { contacts: data.contacts ?? [], groundedUrls };
}

/** Resolve a real LinkedIn URL for a named person via search (anti-hallucination). */
async function resolveLinkedInUrl(opts: {
  name: string;
  company: string;
  cleanedCompany: string;
  title: string;
}): Promise<string | null> {
  const { data, sources } = await generateGroundedJson<ResolvePayload>({
    label: "findReferralContacts.resolveUrl",
    useSearch: true,
    temperature: 0.05,
    system: `Find the LinkedIn profile URL for one person. Never invent handles. JSON only.`,
    prompt: `Find the public LinkedIn profile URL for:
Name: ${opts.name}
Title (claimed): ${opts.title}
Company: ${opts.company} (aka ${opts.cleanedCompany})

Search: site:linkedin.com/in "${opts.name}" "${opts.cleanedCompany}"
Also try: "${opts.name}" "${opts.company}" linkedin

Return JSON:
{ "found": true, "profileUrl": "https://www.linkedin.com/in/...", "evidence": "snippet" }
or { "found": false, "profileUrl": null, "evidence": "" }

Only set found=true if the /in/ URL appears in search results.`,
  });

  const grounded = extractLinkedInUrlsFromGrounding(
    sources,
    `${data.profileUrl ?? ""} ${data.evidence ?? ""}`
  );

  const fromModel = data.found
    ? normalizeLinkedInProfileUrl(data.profileUrl ?? "")
    : null;

  // Prefer URLs that actually appeared in grounding
  if (fromModel && grounded.has(fromModel)) return fromModel;
  if (grounded.size === 1) return [...grounded][0];
  if (fromModel && grounded.size === 0) {
    // Model claimed a URL but grounding didn't surface it — still probe later
    return fromModel;
  }
  return null;
}

async function verifyCandidates(opts: {
  company: string;
  cleanedCompany: string;
  candidates: Array<{ name: string; title: string; profileUrl: string }>;
}): Promise<
  Map<
    string,
    {
      verified: boolean;
      exists: boolean;
      title: string;
      confidence: number;
      evidence: string;
    }
  >
> {
  const map = new Map<
    string,
    {
      verified: boolean;
      exists: boolean;
      title: string;
      confidence: number;
      evidence: string;
    }
  >();
  if (opts.candidates.length === 0) return map;

  const list = opts.candidates
    .map(
      (c, i) =>
        `${i + 1}. ${c.name} — ${c.title} — OPEN THIS URL: ${c.profileUrl}`
    )
    .join("\n");

  const { data } = await generateGroundedJson<VerifyPayload>({
    label: "findReferralContacts.verify",
    useSearch: true,
    temperature: 0.05,
    system: `Verify LinkedIn profiles with Google Search. Be skeptical. JSON only.`,
    prompt: `For each candidate below:
1) Search the EXACT profile URL. If Google/LinkedIn shows "This page doesn't exist" / 404 → profileExists=false.
2) If the profile exists, check they CURRENTLY work at "${opts.company}" (aka "${opts.cleanedCompany}").
   Former/alumni/unclear → verifiedCurrent=false.

Candidates:
${list}

JSON:
{
  "verdicts": [{
    "profileUrl": string,
    "name": string,
    "profileExists": boolean,
    "verifiedCurrent": boolean,
    "currentTitle": string,
    "currentCompany": string,
    "confidence": 0-1,
    "evidence": "snippet"
  }]
}`,
  });

  for (const v of data.verdicts ?? []) {
    const url = normalizeLinkedInProfileUrl(v.profileUrl ?? "");
    if (!url) continue;
    map.set(url.toLowerCase(), {
      verified: Boolean(v.verifiedCurrent),
      exists: v.profileExists !== false,
      title: (v.currentTitle || "").trim(),
      confidence: Math.max(0, Math.min(1, v.confidence ?? 0.5)),
      evidence: (v.evidence || "").trim(),
    });
  }

  return map;
}

export async function findReferralContacts(opts: {
  company: string;
  roleTitle: string;
}): Promise<ReferralContactResult[]> {
  const company = opts.company.trim();
  const roleTitle = opts.roleTitle.trim();
  if (!company || company.toLowerCase() === "unknown") return [];

  const cleanedCompany = cleanCompanyName(company) || company;

  let discovery: { contacts: DiscoveryContact[]; groundedUrls: Set<string> };
  try {
    discovery = await discoverPeople({ company, cleanedCompany, roleTitle });
  } catch (err) {
    console.warn("[referrals] discover failed", company, err);
    return [];
  }

  // Normalize + optionally re-resolve URLs that weren't in grounding
  type Candidate = {
    name: string;
    title: string;
    profileUrl: string;
    confidence: number;
    evidence: string;
  };
  const draft: Candidate[] = [];
  const seenNames = new Set<string>();

  for (const item of discovery.contacts) {
    const name = item.name?.trim();
    const title = item.title?.trim();
    if (!name || !title) continue;
    if (looksFormer(`${title} ${item.evidence ?? ""}`)) continue;
    if (item.currentlyAtCompany === false) continue;

    const nameKey = name.toLowerCase();
    if (seenNames.has(nameKey)) continue;
    seenNames.add(nameKey);

    let profileUrl = normalizeLinkedInProfileUrl(item.profileUrl ?? "");

    // If URL missing or not seen in grounding, resolve via a dedicated search
    const needsResolve =
      !profileUrl ||
      (discovery.groundedUrls.size > 0 && !discovery.groundedUrls.has(profileUrl));

    if (needsResolve) {
      try {
        const resolved = await resolveLinkedInUrl({
          name,
          company,
          cleanedCompany,
          title,
        });
        if (resolved) profileUrl = resolved;
      } catch (err) {
        console.warn("[referrals] resolve failed", name, err);
      }
    }

    if (!profileUrl) continue;

    // If we have grounded URLs from discovery, prefer those that match
    if (
      discovery.groundedUrls.size > 0 &&
      !discovery.groundedUrls.has(profileUrl)
    ) {
      // Still allow if resolve found it — will be HTTP-probed next
    }

    const evidence = (item.evidence ?? "").trim();
    const mentions = companyMentioned(evidence, company, cleanedCompany);
    const confidence = Math.max(0, Math.min(1, item.confidence ?? 0.5));
    if (!mentions && confidence < 0.6) continue;

    draft.push({ name, title, profileUrl, confidence, evidence });
  }

  // Also seed candidates directly from grounded LinkedIn URLs if model returned few people
  // (skip — we lack names for bare URLs)

  draft.sort((a, b) => b.confidence - a.confidence);
  const shortlist = draft.slice(0, 4);
  if (shortlist.length === 0) {
    console.info(`[referrals] no candidates for "${company}"`);
    return [];
  }

  // Hard check: drop LinkedIn 404s ("This page doesn't exist")
  const existing: Candidate[] = [];
  for (const c of shortlist) {
    const ok = await linkedInProfileExists(c.profileUrl);
    console.info(`[referrals] probe ${c.profileUrl} exists=${ok}`);
    if (ok) existing.push(c);
  }
  if (existing.length === 0) {
    console.info(`[referrals] all profile URLs 404'd for "${company}"`);
    return [];
  }

  // Employment verification
  let verdicts = new Map<
    string,
    {
      verified: boolean;
      exists: boolean;
      title: string;
      confidence: number;
      evidence: string;
    }
  >();
  try {
    verdicts = await verifyCandidates({
      company,
      cleanedCompany,
      candidates: existing,
    });
  } catch (err) {
    console.warn("[referrals] verify failed", company, err);
  }

  const out: ReferralContactResult[] = [];

  for (const c of existing) {
    const v = verdicts.get(c.profileUrl.toLowerCase());

    if (verdicts.size > 0) {
      if (v && v.exists === false) continue;
      if (!v?.verified) continue;
      if (looksFormer(`${v.title} ${v.evidence}`)) continue;

      out.push({
        name: c.name,
        title: v.title || c.title,
        company,
        profileUrl: c.profileUrl,
        confidence: Math.max(
          0.55,
          Math.min(1, (c.confidence + v.confidence) / 2 + 0.1)
        ),
        currentlyAtCompany: true,
      });
    } else {
      // Verify call failed — keep probed-live profiles with company evidence
      if (c.confidence < 0.65) continue;
      if (!companyMentioned(c.evidence, company, cleanedCompany)) continue;
      out.push({
        name: c.name,
        title: c.title,
        company,
        profileUrl: c.profileUrl,
        confidence: c.confidence,
        currentlyAtCompany: true,
      });
    }

    if (out.length >= 3) break;
  }

  console.info(
    `[referrals] company="${company}" draft=${draft.length} live=${existing.length} final=${out.length}`
  );

  return out;
}
