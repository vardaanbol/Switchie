/**
 * Resolve the actual hiring employer when job boards list a staffing agency
 * (e.g. "Agile Hiring") as the company while the description names the client
 * (e.g. "Ozonetel").
 */

const STAFFING_NAME =
  /\b(hiring|staffing|recruiters?|recruitment|consultancy|consultants?|talent\s*solutions?|manpower|placement|rpo|hr\s*services?)\b/i;

const LEGAL_SUFFIX =
  /\b(pvt\.?|private|ltd\.?|limited|inc\.?|llc|llp|corp\.?|corporation|technologies|technology|solutions|labs?|india|group)\b/gi;

/** Phrases that introduce the real employer in agency-posted JDs. */
const CLIENT_PATTERNS: RegExp[] = [
  /hiring\s+for\s+([A-Z][\w&.''\-\s]{1,50}?)(?=\s*(?:,|\.|-|–|—|\||\(|\)|;|:|in\b|at\b|to\b|based\b|looking\b|who\b|which\b|$))/i,
  /on\s+behalf\s+of\s+([A-Z][\w&.''\-\s]{1,50}?)(?=\s*(?:,|\.|-|–|—|\||\(|\)|;|:|in\b|at\b|to\b|$))/i,
  /(?:our\s+)?client\s*(?:is|:)?\s*([A-Z][\w&.''\-\s]{1,50}?)(?=\s*(?:,|\.|-|–|—|\||\(|\)|;|:|in\b|at\b|$))/i,
  /(?:working\s+with|role\s+at|join)\s+([A-Z][\w&.''\-\s]{1,50}?)(?=\s*(?:,|\.|-|–|—|\||\(|\)|;|:|as\b|in\b|to\b|$))/i,
  /employer\s*(?:is|:)\s*([A-Z][\w&.''\-\s]{1,50}?)(?=\s*(?:,|\.|-|–|—|\||\(|\)|;|:|$))/i,
];

function cleanCaptured(raw: string): string {
  return raw
    .replace(LEGAL_SUFFIX, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,.-]+|[\s,.-]+$/g, "")
    .trim();
}

function looksLikeStaffingAgency(name: string): boolean {
  const n = name.trim();
  if (!n) return true;
  if (/^unknown$/i.test(n)) return true;
  if (STAFFING_NAME.test(n)) return true;
  // Pure agency-style names like "Agile Hiring", "ABC Recruiters"
  if (/hiring$/i.test(n) && n.split(/\s+/).length <= 4) return true;
  return false;
}

function extractClientFromText(text: string): string | null {
  if (!text?.trim()) return null;
  for (const pattern of CLIENT_PATTERNS) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const cleaned = cleanCaptured(match[1]);
    if (cleaned.length < 2 || cleaned.length > 60) continue;
    if (looksLikeStaffingAgency(cleaned)) continue;
    // Reject generic captures
    if (
      /^(the|a|an|our|their|this|company|client|candidate|you|we)$/i.test(
        cleaned
      )
    ) {
      continue;
    }
    return cleaned;
  }
  return null;
}

/**
 * Prefer the real employer over a staffing/agency poster name.
 * Uses description (and title) heuristics; caller may still override via LLM.
 */
export function resolveEmployerCompany(opts: {
  postedAs: string;
  title?: string;
  description?: string;
  /** Optional LLM-extracted employer; wins when non-empty and not an agency. */
  preferredEmployer?: string | null;
}): string {
  const posted = (opts.postedAs ?? "").trim() || "Unknown";
  const preferred = (opts.preferredEmployer ?? "").trim();

  if (preferred && !looksLikeStaffingAgency(preferred)) {
    return preferred;
  }

  const blob = `${opts.title ?? ""}\n${opts.description ?? ""}`;
  const fromText = extractClientFromText(blob);

  if (looksLikeStaffingAgency(posted)) {
    if (fromText) return fromText;
    if (preferred) return preferred;
  }

  // Posted name looks like a real company — keep it unless text clearly names
  // a different client and the poster still smells like an agency.
  return posted;
}

export function isStaffingAgencyName(name: string): boolean {
  return looksLikeStaffingAgency(name);
}
