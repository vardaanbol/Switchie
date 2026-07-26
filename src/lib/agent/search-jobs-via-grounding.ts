import { generateJson } from "@/lib/agent/gemini";
import type { WorkMode } from "@/models/User";

export type RawJobCandidate = {
  title: string;
  company: string;
  description?: string;
  sourceUrl: string;
  location?: string;
  workMode?: WorkMode;
  salaryEstimateMin?: number;
  salaryEstimateMax?: number;
  source: "adzuna" | "gemini";
};

export type UserProfileContext = {
  name: string;
  salaryExpectationMin?: number;
  salaryExpectationMax?: number;
  workMode?: WorkMode;
  preferredLocations: string[];
  rolesOfInterest: string[];
  resumeParsedSkills: string[];
  /** Full-time years from the resume; used to filter jobs within ±2 years. */
  resumeExperienceYears?: number;
};

export async function searchJobsViaGrounding(
  profile: UserProfileContext
): Promise<RawJobCandidate[]> {
  const locations =
    profile.preferredLocations.length > 0
      ? profile.preferredLocations.join(", ")
      : "India";
  const roles = profile.rolesOfInterest.join(", ");
  const mode = profile.workMode ?? "both";

  const result = await generateJson<{ jobs: RawJobCandidate[] }>({
    label: "searchJobsViaGrounding",
    useSearch: true,
    prompt: `Find currently open job postings in India matching this candidate:
Roles: ${roles}
Work mode preference: ${mode}
Locations: ${locations}
Salary expectation (INR annual): ${profile.salaryExpectationMin ?? "?"}–${profile.salaryExpectationMax ?? "?"}
Skills: ${profile.resumeParsedSkills.slice(0, 15).join(", ") || "not provided"}

Use web search to find real, current listings from company career pages or job boards.
Only return URLs that open a SPECIFIC job posting (apply page / role detail), never a company profile, /jobs index, or careers landing page with no role.
Prefer postings dated within the last 7 days. Skip closed, filled, or “no openings” pages.
Return JSON: {
  "jobs": [{
    "title": string,
    "company": string (the ACTUAL employer the candidate would work for — never a staffing agency, hiring platform, or job board like "Agile Hiring"),
    "description": string,
    "sourceUrl": string (must be a real URL),
    "location": string,
    "workMode": "onsite" | "remote" | "both",
    "salaryEstimateMin": number | null (INR annual),
    "salaryEstimateMax": number | null (INR annual)
  }]
}
Return at most 8 high-quality matches. Prefer India-based roles. Skip stale or generic aggregator spam.
If a post is from a recruiter hiring for a client, set company to the client name.`,
  });

  return (result.jobs ?? [])
    .filter((j) => j.title && j.company && j.sourceUrl)
    .map((j) => ({
      ...j,
      source: "gemini" as const,
      sourceUrl: j.sourceUrl.trim(),
    }));
}
