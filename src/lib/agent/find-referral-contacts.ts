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
  source?: ReferralSourceKind;
};

export type ReferralSourceKind =
  | "linkedin"
  | "github"
  | "twitter"
  | "theorg"
  | "medium"
  | "company"
  | "web";

type DiscoveryContact = {
  name?: string;
  title?: string;
  company?: string;
  profileUrl?: string;
  confidence?: number;
  currentlyAtCompany?: boolean;
  evidence?: string;
  whyUseful?: string;
  source?: string;
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
    employmentStatus?: "current" | "former" | "unclear";
    confidence?: number;
    evidence?: string;
  }>;
};

type Candidate = {
  name: string;
  title: string;
  profileUrl: string;
  confidence: number;
  evidence: string;
  source: ReferralSourceKind;
};

type ProfileProbeStatus = "exists" | "missing" | "unknown";

/** Strip legal suffixes / noise so search matches public profiles better. */
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

function sourceRank(kind: ReferralSourceKind): number {
  switch (kind) {
    case "linkedin":
      return 0;
    case "theorg":
      return 1;
    case "company":
      return 2;
    case "github":
      return 3;
    case "twitter":
      return 4;
    case "medium":
      return 5;
    default:
      return 6;
  }
}

export function classifyReferralSource(url: string): ReferralSourceKind {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (host === "linkedin.com" || host.endsWith(".linkedin.com")) {
      return "linkedin";
    }
    if (host === "github.com") return "github";
    if (host === "twitter.com" || host === "x.com") return "twitter";
    if (host === "theorg.com" || host.endsWith(".theorg.com")) return "theorg";
    if (host === "medium.com") return "medium";
    if (/(^|\.)(careers|jobs|team|about)\./i.test(host)) return "company";
    return "web";
  } catch {
    return "web";
  }
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
    if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) return null;

    const match = url.pathname.match(/^\/in\/([^/?#]+)\/?/i);
    if (!match?.[1]) return null;

    let handle = decodeURIComponent(match[1]).replace(/\/+$/, "");
    try {
      if (/%[0-9a-f]{2}/i.test(handle)) handle = decodeURIComponent(handle);
    } catch {
      /* keep */
    }
    if (!handle || handle.length < 3) return null;
    if (/^(pub|dir|company|school|jobs|in|me|preload)$/i.test(handle)) {
      return null;
    }
    if (!/^[a-zA-Z0-9][a-zA-Z0-9\-_.]{1,100}$/.test(handle)) return null;

    return `https://www.linkedin.com/in/${handle}`;
  } catch {
    return null;
  }
}

function normalizeGithubProfileUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "github.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 1) return null;
    const handle = decodeURIComponent(parts[0]);
    if (
      /^(orgs|organizations|settings|login|signup|explore|topics|collections|events|marketplace|pricing|about|features|enterprise|security|customer-stories|team|enterprise|copilot|codespaces|issues|pulls|notifications)$/i.test(
        handle
      )
    ) {
      return null;
    }
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(handle)) {
      return null;
    }
    return `https://github.com/${handle}`;
  } catch {
    return null;
  }
}

function normalizeTwitterProfileUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "twitter.com" && host !== "x.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 1) return null;
    const handle = decodeURIComponent(parts[0]).replace(/^@/, "");
    if (
      /^(home|explore|search|i|intent|share|hashtag|settings|login|signup|messages|notifications|compose)$/i.test(
        handle
      )
    ) {
      return null;
    }
    if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) return null;
    return `https://x.com/${handle}`;
  } catch {
    return null;
  }
}

function normalizeTheOrgUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "theorg.com" && !host.endsWith(".theorg.com")) return null;
    if (!/\/org\/[^/]+\/(?:org-chart|people|teams)/i.test(url.pathname)) {
      // Still allow person pages under /org/...
      if (!/\/org\//i.test(url.pathname)) return null;
    }
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function normalizeMediumUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "medium.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 1 || !parts[0].startsWith("@")) return null;
    return `https://medium.com/${parts[0]}`;
  } catch {
    return null;
  }
}

function isBlockedReferralHost(host: string): boolean {
  return (
    /(^|\.)(facebook|instagram|tiktok|youtube|youtu\.be|reddit|quora|glassdoor|indeed|naukri|linkedin)\.com$/i.test(
      host
    ) ||
    host === "linkedin.com" ||
    host.endsWith(".linkedin.com")
  );
}

function looksLikePersonOrTeamPage(url: URL): boolean {
  const path = url.pathname.toLowerCase();
  return (
    /\/(team|about|people|leadership|staff|authors?|speakers?|engineering|careers)\b/.test(
      path
    ) || /\/(u|user|users|profile|profiles|people)\//.test(path)
  );
}

/**
 * Normalize any public referral URL we are willing to show.
 * LinkedIn remains preferred, but GitHub / X / team pages / etc. are allowed.
 */
export function normalizeReferralProfileUrl(raw: string): string | null {
  const trimmed = raw.trim().replace(/[.,;:)]+$/, "");
  if (!trimmed) return null;

  const linkedIn = normalizeLinkedInProfileUrl(trimmed);
  if (linkedIn) return linkedIn;

  const github = normalizeGithubProfileUrl(trimmed);
  if (github) return github;

  const twitter = normalizeTwitterProfileUrl(trimmed);
  if (twitter) return twitter;

  const theorg = normalizeTheOrgUrl(trimmed);
  if (theorg) return theorg;

  const medium = normalizeMediumUrl(trimmed);
  if (medium) return medium;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (isBlockedReferralHost(host)) return null;
    if (host.length < 3) return null;
    // Keep only pages that look like a person/team presence — not random articles
    if (!looksLikePersonOrTeamPage(url) && !/about|team|people/i.test(host)) {
      // Allow personal domains / portfolios when path is short (homepage or /about)
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length > 2) return null;
    }
    url.hash = "";
    // Drop tracking params
    url.search = "";
    return url.toString().replace(/\/$/, "") || url.origin;
  } catch {
    return null;
  }
}

/** Pull every usable profile URL mentioned in grounding + model text. */
export function extractProfileUrlsFromGrounding(
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
  const matches = haystack.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
  for (const m of matches) {
    const normalized = normalizeReferralProfileUrl(m);
    if (normalized) found.add(normalized);
  }

  return found;
}

/** @deprecated Prefer extractProfileUrlsFromGrounding — kept for callers. */
export function extractLinkedInUrlsFromGrounding(
  sources: GroundingSource[],
  extraText = ""
): Set<string> {
  const all = extractProfileUrlsFromGrounding(sources, extraText);
  return new Set(
    [...all].filter((u) => classifyReferralSource(u) === "linkedin")
  );
}

/**
 * Only report `missing` when the host gives positive evidence. Network
 * failures and bot challenges are inconclusive and must not erase an otherwise
 * grounded candidate.
 */
export async function probeProfileUrl(url: string): Promise<ProfileProbeStatus> {
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
      /This page doesn'?t exist|page not found|profile not found|we couldn'?t find that page|doesn'?t exist|404 not found|repository not found|user not found|account suspended/i.test(
        text
      )
    ) {
      return "missing";
    }

    if (res.status === 404) return "missing";

    if (res.status === 999 || res.status === 429 || res.status === 403) {
      return "unknown";
    }

    if (res.status >= 400) return "unknown";

    return "exists";
  } catch (err) {
    console.warn("[referrals] profile probe failed", url, err);
    return "unknown";
  }
}

/** @deprecated Prefer probeProfileUrl */
export async function probeLinkedInProfile(
  url: string
): Promise<ProfileProbeStatus> {
  return probeProfileUrl(url);
}

async function discoverLinkedInPeople(opts: {
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
    label: "findReferralContacts.discoverLinkedIn",
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
    "whyUseful": "recruiter | hiring manager | peer",
    "source": "linkedin"
  }]
}
Return [] if nothing solid.`,
  });

  const groundedUrls = extractProfileUrlsFromGrounding(
    sources,
    JSON.stringify(data)
  );

  console.info(
    `[referrals] linkedin company="${opts.company}" queries=${JSON.stringify(searchQueries)} grounded=${groundedUrls.size} raw=${data.contacts?.length ?? 0}`
  );

  return { contacts: data.contacts ?? [], groundedUrls };
}

/**
 * Broader web pass: company team pages, TheOrg, GitHub, X/Twitter, speaker bios.
 * Used to fill gaps when LinkedIn is sparse.
 */
async function discoverWebPeople(opts: {
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
    label: "findReferralContacts.discoverWeb",
    useSearch: true,
    temperature: 0.2,
    system: `You research public referral contacts across the open web (not inventing URLs). Only copy profile/team URLs that appear in search results. JSON only.`,
    prompt: `Find people who CURRENTLY work at "${opts.company}" (aka "${searchCompany}") who could refer a candidate for "${opts.roleTitle}". Prefer public, non-LinkedIn sources when LinkedIn is thin.

Required Google searches:
1) "${searchCompany}" (team OR leadership OR "about us" OR people) (${hints})
2) site:theorg.com "${searchCompany}"
3) site:github.com "${searchCompany}" (engineer OR "works at" OR @)
4) ("${searchCompany}" OR "${opts.company}") (twitter OR "x.com" OR medium.com) (engineer OR recruiter OR "hiring manager")
5) "${searchCompany}" ("speaker" OR conference OR author) (${hints}) India

Rules:
- Copy the EXACT public URL from search results (GitHub profile, X/Twitter, TheOrg person/team page, company /team or /about page, personal site, Medium @profile).
- Never invent handles or URLs.
- Skip job-board listings, Glassdoor, Facebook, Instagram.
- Prefer recruiters / hiring managers / eng managers / peers currently at the company.
- Evidence must mention the company name.

JSON:
{
  "contacts": [{
    "name": string,
    "title": string,
    "company": "${opts.company}",
    "profileUrl": "https://exact-url-from-results",
    "confidence": 0-1,
    "currentlyAtCompany": true,
    "evidence": "snippet that includes company + title",
    "whyUseful": "recruiter | hiring manager | peer | team page",
    "source": "github | twitter | theorg | company | web | medium"
  }]
}
Return [] if nothing solid.`,
  });

  const groundedUrls = extractProfileUrlsFromGrounding(
    sources,
    JSON.stringify(data)
  );

  console.info(
    `[referrals] web company="${opts.company}" queries=${JSON.stringify(searchQueries)} grounded=${groundedUrls.size} raw=${data.contacts?.length ?? 0}`
  );

  return { contacts: data.contacts ?? [], groundedUrls };
}

/** Resolve a real public profile URL for a named person via search. */
async function resolveProfileUrl(opts: {
  name: string;
  company: string;
  cleanedCompany: string;
  title: string;
  preferLinkedIn?: boolean;
}): Promise<string | null> {
  const { data, sources } = await generateGroundedJson<ResolvePayload>({
    label: "findReferralContacts.resolveUrl",
    useSearch: true,
    temperature: 0.05,
    system: `Find a public profile URL for one person. Never invent handles. JSON only.`,
    prompt: `Find a public profile URL for:
Name: ${opts.name}
Title (claimed): ${opts.title}
Company: ${opts.company} (aka ${opts.cleanedCompany})

Search:
1) site:linkedin.com/in "${opts.name}" "${opts.cleanedCompany}"
2) "${opts.name}" "${opts.company}" (linkedin OR github OR "x.com" OR twitter OR theorg OR medium)
3) "${opts.name}" "${opts.cleanedCompany}" (engineer OR recruiter OR manager)

Prefer LinkedIn /in/ if present, otherwise GitHub, X/Twitter, TheOrg, or a company team/about page that names them.

Return JSON:
{ "found": true, "profileUrl": "https://...", "evidence": "snippet" }
or { "found": false, "profileUrl": null, "evidence": "" }

Only set found=true if the URL appears in search results.`,
  });

  const grounded = extractProfileUrlsFromGrounding(
    sources,
    `${data.profileUrl ?? ""} ${data.evidence ?? ""}`
  );

  const fromModel = data.found
    ? normalizeReferralProfileUrl(data.profileUrl ?? "")
    : null;

  if (opts.preferLinkedIn !== false) {
    const linkedIn = [...grounded].find(
      (u) => classifyReferralSource(u) === "linkedin"
    );
    if (linkedIn) return linkedIn;
    if (fromModel && classifyReferralSource(fromModel) === "linkedin") {
      return fromModel;
    }
  }

  if (fromModel && grounded.has(fromModel)) return fromModel;
  if (grounded.size === 1) return [...grounded][0];
  if (fromModel && grounded.size === 0) return fromModel;

  // Prefer higher-ranked sources from grounding
  const ranked = [...grounded].sort(
    (a, b) =>
      sourceRank(classifyReferralSource(a)) -
      sourceRank(classifyReferralSource(b))
  );
  return ranked[0] ?? null;
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
      employmentStatus: "current" | "former" | "unclear";
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
      employmentStatus: "current" | "former" | "unclear";
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
    system: `Verify public profile / team pages with Google Search. Be skeptical. JSON only.`,
    prompt: `For each candidate below:
1) Search the EXACT profile/page URL. If results show "This page doesn't exist" / 404 → profileExists=false.
2) If the page exists, check they CURRENTLY work at "${opts.company}" (aka "${opts.cleanedCompany}").
   Use employmentStatus="former" only with positive evidence they left.
   If search snippets do not establish current or former employment, use "unclear".
   Company team/about pages that list them as current staff count as current.

Candidates:
${list}

JSON:
{
  "verdicts": [{
    "profileUrl": string,
    "name": string,
    "profileExists": boolean,
    "verifiedCurrent": boolean,
    "employmentStatus": "current" | "former" | "unclear",
    "currentTitle": string,
    "currentCompany": string,
    "confidence": 0-1,
    "evidence": "snippet"
  }]
}`,
  });

  for (const v of data.verdicts ?? []) {
    const url = normalizeReferralProfileUrl(v.profileUrl ?? "");
    if (!url) continue;
    const employmentStatus =
      v.employmentStatus ??
      (v.verifiedCurrent === true
        ? "current"
        : looksFormer(`${v.currentTitle ?? ""} ${v.evidence ?? ""}`)
          ? "former"
          : "unclear");
    map.set(url.toLowerCase(), {
      verified: v.verifiedCurrent === true || employmentStatus === "current",
      exists: v.profileExists !== false,
      employmentStatus,
      title: (v.currentTitle || "").trim(),
      confidence: Math.max(0, Math.min(1, v.confidence ?? 0.5)),
      evidence: (v.evidence || "").trim(),
    });
  }

  return map;
}

async function buildDraftFromDiscovery(opts: {
  company: string;
  cleanedCompany: string;
  contacts: DiscoveryContact[];
  groundedUrls: Set<string>;
  resolveMissing: boolean;
}): Promise<Candidate[]> {
  const draft: Candidate[] = [];
  const seenNames = new Set<string>();
  const seenUrls = new Set<string>();

  for (const item of opts.contacts) {
    const name = item.name?.trim();
    const title = item.title?.trim();
    if (!name || !title) continue;
    if (looksFormer(`${title} ${item.evidence ?? ""}`)) continue;
    if (item.currentlyAtCompany === false) continue;

    const nameKey = name.toLowerCase();
    if (seenNames.has(nameKey)) continue;

    let profileUrl = normalizeReferralProfileUrl(item.profileUrl ?? "");

    const needsResolve =
      opts.resolveMissing &&
      (!profileUrl ||
        (opts.groundedUrls.size > 0 && !opts.groundedUrls.has(profileUrl)));

    if (needsResolve) {
      try {
        const resolved = await resolveProfileUrl({
          name,
          company: opts.company,
          cleanedCompany: opts.cleanedCompany,
          title,
        });
        if (resolved) profileUrl = resolved;
      } catch (err) {
        console.warn("[referrals] resolve failed", name, err);
      }
    }

    if (!profileUrl) continue;
    const urlKey = profileUrl.toLowerCase();
    if (seenUrls.has(urlKey)) continue;

    const evidence = (item.evidence ?? "").trim();
    const mentions = companyMentioned(
      evidence,
      opts.company,
      opts.cleanedCompany
    );
    const confidence = Math.max(0, Math.min(1, item.confidence ?? 0.5));
    if (!mentions && confidence < 0.6) continue;

    seenNames.add(nameKey);
    seenUrls.add(urlKey);
    draft.push({
      name,
      title,
      profileUrl,
      confidence,
      evidence,
      source: classifyReferralSource(profileUrl),
    });
  }

  return draft;
}

export async function findReferralContacts(opts: {
  company: string;
  roleTitle: string;
}): Promise<ReferralContactResult[]> {
  const company = opts.company.trim();
  const roleTitle = opts.roleTitle.trim();
  if (!company || company.toLowerCase() === "unknown") return [];

  const cleanedCompany = cleanCompanyName(company) || company;

  const [linkedinResult, webResult] = await Promise.allSettled([
    discoverLinkedInPeople({ company, cleanedCompany, roleTitle }),
    discoverWebPeople({ company, cleanedCompany, roleTitle }),
  ]);

  const linkedin =
    linkedinResult.status === "fulfilled"
      ? linkedinResult.value
      : { contacts: [], groundedUrls: new Set<string>() };
  const web =
    webResult.status === "fulfilled"
      ? webResult.value
      : { contacts: [], groundedUrls: new Set<string>() };

  if (linkedinResult.status === "rejected") {
    console.warn("[referrals] linkedin discover failed", company, linkedinResult.reason);
  }
  if (webResult.status === "rejected") {
    console.warn("[referrals] web discover failed", company, webResult.reason);
  }

  const linkedinDraft = await buildDraftFromDiscovery({
    company,
    cleanedCompany,
    contacts: linkedin.contacts,
    groundedUrls: linkedin.groundedUrls,
    // Resolve missing LinkedIn URLs — expensive but high value
    resolveMissing: true,
  });

  const webDraft = await buildDraftFromDiscovery({
    company,
    cleanedCompany,
    contacts: web.contacts,
    groundedUrls: web.groundedUrls,
    // Skip per-person resolve for web pass to keep latency down; grounding is enough
    resolveMissing: false,
  });

  // Prefer LinkedIn, then fill with other web sources
  const merged = [...linkedinDraft, ...webDraft];
  const byName = new Map<string, Candidate>();
  for (const c of merged) {
    const key = c.name.toLowerCase();
    const prev = byName.get(key);
    if (!prev) {
      byName.set(key, c);
      continue;
    }
    const better =
      sourceRank(c.source) < sourceRank(prev.source) ||
      (sourceRank(c.source) === sourceRank(prev.source) &&
        c.confidence > prev.confidence);
    if (better) byName.set(key, c);
  }

  const draft = [...byName.values()].sort((a, b) => {
    const sourceDiff = sourceRank(a.source) - sourceRank(b.source);
    if (sourceDiff !== 0) return sourceDiff;
    return b.confidence - a.confidence;
  });

  const shortlist = draft.slice(0, 6);
  if (shortlist.length === 0) {
    console.info(`[referrals] no candidates for "${company}"`);
    return [];
  }

  // Drop only confirmed 404s. Bot blocks / timeouts stay as unknown.
  const existing: Candidate[] = [];
  for (const c of shortlist) {
    const status = await probeProfileUrl(c.profileUrl);
    console.info(
      `[referrals] probe ${c.profileUrl} source=${c.source} status=${status}`
    );
    if (status !== "missing") existing.push(c);
  }
  if (existing.length === 0) {
    console.info(`[referrals] all profile URLs 404'd for "${company}"`);
    return [];
  }

  let verdicts = new Map<
    string,
    {
      verified: boolean;
      exists: boolean;
      employmentStatus: "current" | "former" | "unclear";
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
    const hasStrongDiscoveryEvidence =
      c.confidence >= 0.6 &&
      companyMentioned(c.evidence, company, cleanedCompany);

    if (v) {
      if (v.exists === false || v.employmentStatus === "former") continue;
      if (looksFormer(`${v.title} ${v.evidence}`)) continue;
      if (!v.verified && !hasStrongDiscoveryEvidence) continue;

      out.push({
        name: c.name,
        title: v.title || c.title,
        company,
        profileUrl: c.profileUrl,
        confidence: Math.max(
          0.55,
          Math.min(
            1,
            (c.confidence + v.confidence) / 2 + (v.verified ? 0.1 : 0)
          )
        ),
        currentlyAtCompany: true,
        source: c.source,
      });
    } else {
      if (!hasStrongDiscoveryEvidence) continue;
      out.push({
        name: c.name,
        title: c.title,
        company,
        profileUrl: c.profileUrl,
        confidence: c.confidence,
        currentlyAtCompany: true,
        source: c.source,
      });
    }

    if (out.length >= 5) break;
  }

  console.info(
    `[referrals] company="${company}" draft=${draft.length} live=${existing.length} final=${out.length} sources=${out
      .map((c) => c.source)
      .join(",")}`
  );

  return out;
}
