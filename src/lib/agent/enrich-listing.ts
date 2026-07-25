import { generateJson } from "@/lib/agent/gemini";
import type { RawJobCandidate, UserProfileContext } from "@/lib/agent/search-jobs-via-grounding";
import type { WorkMode } from "@/models/User";
import { resolveEmployerCompany } from "@/lib/jobs/resolve-employer";

export type EnrichedListing = {
  title: string;
  company: string;
  description: string;
  sourceUrl: string;
  location: string;
  workMode?: WorkMode;
  salaryEstimateMin?: number;
  salaryEstimateMax?: number;
  salaryIsEstimate: boolean;
  pros: string[];
  cons: string[];
  matchScore: number;
  /** Years of full-time experience the JD asks for; null if unstated. */
  requiredExperienceYears: number | null;
};

export async function enrichListing(
  listing: RawJobCandidate,
  profile: UserProfileContext
): Promise<EnrichedListing> {
  const hadSalary =
    typeof listing.salaryEstimateMin === "number" ||
    typeof listing.salaryEstimateMax === "number";

  const experienceHint =
    typeof profile.resumeExperienceYears === "number"
      ? `${profile.resumeExperienceYears} years full-time`
      : "unknown";

  const result = await generateJson<{
    description: string;
    employerCompany: string | null;
    pros: string[];
    cons: string[];
    salaryEstimateMin: number | null;
    salaryEstimateMax: number | null;
    salaryIsEstimate: boolean;
    workMode: WorkMode | null;
    matchScore: number;
    requiredExperienceYears: number | null;
  }>({
    label: "enrichListing",
    prompt: `Enrich this job listing for an Indian job seeker. All salaries in INR (annual).

Candidate profile:
- Roles: ${profile.rolesOfInterest.join(", ")}
- Work mode: ${profile.workMode ?? "both"}
- Locations: ${profile.preferredLocations.join(", ") || "any"}
- Salary expectation INR: ${profile.salaryExpectationMin ?? "?"}–${profile.salaryExpectationMax ?? "?"}
- Skills: ${profile.resumeParsedSkills.slice(0, 20).join(", ") || "n/a"}
- Full-time experience: ${experienceHint}

Listing:
- Title: ${listing.title}
- Posted company (may be a staffing agency, NOT the real employer): ${listing.company}
- Location: ${listing.location ?? "n/a"}
- Work mode: ${listing.workMode ?? "n/a"}
- URL: ${listing.sourceUrl}
- Known salary: ${listing.salaryEstimateMin ?? "?"}–${listing.salaryEstimateMax ?? "?"}
- Description: ${(listing.description ?? "").slice(0, 3000)}

Return JSON:
{
  "description": "clean 2-3 sentence description (mention the real employer)",
  "employerCompany": "the ACTUAL company the candidate would work for (e.g. Ozonetel). NEVER return a staffing/recruiting agency, hiring platform, or job board (e.g. Agile Hiring, Naukri, Indeed). If the post says hiring for / on behalf of / our client X, use X. null only if truly unknown.",
  "pros": string[3-4],
  "cons": string[2-3],
  "salaryEstimateMin": number|null,
  "salaryEstimateMax": number|null,
  "salaryIsEstimate": boolean,
  "workMode": "onsite"|"remote"|"both"|null,
  "matchScore": number 0-100,
  "requiredExperienceYears": number|null
}

requiredExperienceYears: parse the JD for years of experience required (e.g. "3-5 years" → 4 as midpoint, "5+ years" → 5). null if the JD does not state experience.
If salary was missing, estimate INR range from role/location/level cues and set salaryIsEstimate=true.
If salary was provided, keep/normalize to INR annual and set salaryIsEstimate=${!hadSalary}.
Match score should weigh role fit, salary vs expectation, location/mode fit, and experience fit vs the candidate's years.`,
  });

  const requiredRaw = Number(result.requiredExperienceYears);
  const requiredExperienceYears =
    Number.isFinite(requiredRaw) && requiredRaw >= 0
      ? Math.round(requiredRaw * 10) / 10
      : null;

  const company = resolveEmployerCompany({
    postedAs: listing.company,
    title: listing.title,
    description: listing.description ?? result.description ?? "",
    preferredEmployer: result.employerCompany,
  });

  return {
    title: listing.title,
    company,
    description: result.description || listing.description || "",
    sourceUrl: listing.sourceUrl,
    location: listing.location || "",
    workMode: result.workMode ?? listing.workMode,
    salaryEstimateMin: result.salaryEstimateMin ?? listing.salaryEstimateMin,
    salaryEstimateMax: result.salaryEstimateMax ?? listing.salaryEstimateMax,
    salaryIsEstimate: result.salaryIsEstimate ?? !hadSalary,
    pros: (result.pros ?? []).slice(0, 4),
    cons: (result.cons ?? []).slice(0, 3),
    matchScore: Math.max(0, Math.min(100, Math.round(result.matchScore ?? 0))),
    requiredExperienceYears,
  };
}

/** Keep jobs whose required years are within ±window of the candidate. */
export function withinExperienceWindow(
  requiredYears: number | null | undefined,
  candidateYears: number | null | undefined,
  window = 2
): boolean {
  if (typeof requiredYears !== "number" || typeof candidateYears !== "number") {
    // Unknown requirement → keep; unknown candidate experience → keep.
    return true;
  }
  return Math.abs(requiredYears - candidateYears) <= window;
}
