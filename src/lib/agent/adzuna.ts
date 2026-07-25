import type { RawJobCandidate, UserProfileContext } from "@/lib/agent/search-jobs-via-grounding";
import type { WorkMode } from "@/models/User";

type AdzunaResult = {
  results?: Array<{
    title?: string;
    company?: { display_name?: string };
    description?: string;
    redirect_url?: string;
    location?: { display_name?: string };
    salary_min?: number;
    salary_max?: number;
    contract_time?: string;
  }>;
};

function inferWorkMode(text: string): WorkMode | undefined {
  const lower = text.toLowerCase();
  const remote = lower.includes("remote") || lower.includes("work from home") || lower.includes("wfh");
  const onsite = lower.includes("onsite") || lower.includes("on-site") || lower.includes("office");
  if (remote && onsite) return "both";
  if (remote) return "remote";
  if (onsite) return "onsite";
  return undefined;
}

export async function searchAdzunaJobs(
  profile: UserProfileContext
): Promise<RawJobCandidate[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    console.warn("[adzuna] Missing ADZUNA_APP_ID/ADZUNA_APP_KEY — skipping");
    return [];
  }

  const roles =
    profile.rolesOfInterest.length > 0
      ? profile.rolesOfInterest
      : ["software engineer"];

  const locations =
    profile.workMode === "remote"
      ? [""]
      : profile.preferredLocations.length > 0
        ? profile.preferredLocations.slice(0, 2)
        : ["Bengaluru"];

  const listings: RawJobCandidate[] = [];

  for (const role of roles.slice(0, 3)) {
    for (const location of locations.slice(0, 2)) {
      const params = new URLSearchParams({
        app_id: appId,
        app_key: appKey,
        results_per_page: "10",
        what: role,
        content: "1",
      });
      if (location) params.set("where", location);
      if (profile.salaryExpectationMin) {
        params.set("salary_min", String(profile.salaryExpectationMin));
      }

      const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?${params}`;
      try {
        const res = await fetch(url, { next: { revalidate: 0 } });
        if (!res.ok) {
          console.warn(`[adzuna] ${res.status} for ${role} @ ${location || "any"}`);
          continue;
        }
        const data = (await res.json()) as AdzunaResult;
        for (const item of data.results ?? []) {
          if (!item.title || !item.redirect_url) continue;
          const blob = `${item.title} ${item.description ?? ""}`;
          listings.push({
            title: item.title,
            company: item.company?.display_name || "Unknown",
            description: item.description,
            sourceUrl: item.redirect_url,
            location: item.location?.display_name || location || "India",
            workMode: inferWorkMode(blob) ?? (profile.workMode === "remote" ? "remote" : undefined),
            salaryEstimateMin: item.salary_min,
            salaryEstimateMax: item.salary_max,
            source: "adzuna",
          });
        }
      } catch (err) {
        console.warn("[adzuna] fetch failed", err);
      }
    }
  }

  return listings;
}
