import { generateJson } from "@/lib/agent/gemini";
import type { RawJobCandidate, UserProfileContext } from "@/lib/agent/search-jobs-via-grounding";
import type { WorkMode } from "@/models/User";

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
};

export async function enrichListing(
  listing: RawJobCandidate,
  profile: UserProfileContext
): Promise<EnrichedListing> {
  const hadSalary =
    typeof listing.salaryEstimateMin === "number" ||
    typeof listing.salaryEstimateMax === "number";

  const result = await generateJson<{
    description: string;
    pros: string[];
    cons: string[];
    salaryEstimateMin: number | null;
    salaryEstimateMax: number | null;
    salaryIsEstimate: boolean;
    workMode: WorkMode | null;
    matchScore: number;
  }>({
    label: "enrichListing",
    prompt: `Enrich this job listing for an Indian job seeker. All salaries in INR (annual).

Candidate profile:
- Roles: ${profile.rolesOfInterest.join(", ")}
- Work mode: ${profile.workMode ?? "both"}
- Locations: ${profile.preferredLocations.join(", ") || "any"}
- Salary expectation INR: ${profile.salaryExpectationMin ?? "?"}–${profile.salaryExpectationMax ?? "?"}
- Skills: ${profile.resumeParsedSkills.slice(0, 20).join(", ") || "n/a"}

Listing:
- Title: ${listing.title}
- Company: ${listing.company}
- Location: ${listing.location ?? "n/a"}
- Work mode: ${listing.workMode ?? "n/a"}
- URL: ${listing.sourceUrl}
- Known salary: ${listing.salaryEstimateMin ?? "?"}–${listing.salaryEstimateMax ?? "?"}
- Description: ${(listing.description ?? "").slice(0, 3000)}

Return JSON:
{
  "description": "clean 2-3 sentence description",
  "pros": string[3-4],
  "cons": string[2-3],
  "salaryEstimateMin": number|null,
  "salaryEstimateMax": number|null,
  "salaryIsEstimate": boolean,
  "workMode": "onsite"|"remote"|"both"|null,
  "matchScore": number 0-100
}

If salary was missing, estimate INR range from role/location/level cues and set salaryIsEstimate=true.
If salary was provided, keep/normalize to INR annual and set salaryIsEstimate=${!hadSalary}.
Match score should weigh role fit, salary vs expectation, location/mode fit.`,
  });

  return {
    title: listing.title,
    company: listing.company,
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
  };
}
