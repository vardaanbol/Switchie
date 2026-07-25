import type { RawJobCandidate, UserProfileContext } from "@/lib/agent/search-jobs-via-grounding";
import type { WorkMode } from "@/models/User";
import { resolveEmployerCompany } from "@/lib/jobs/resolve-employer";

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

async function fetchAdzunaPage(args: {
  appId: string;
  appKey: string;
  role: string;
  location: string;
  salaryMin?: number;
}): Promise<RawJobCandidate[]> {
  const params = new URLSearchParams({
    app_id: args.appId,
    app_key: args.appKey,
    results_per_page: "10",
    what: args.role,
  });
  if (args.location) params.set("where", args.location);
  if (args.salaryMin) params.set("salary_min", String(args.salaryMin));

  const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?${params}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      const message = (await res.text()).slice(0, 300);
      console.warn(
        `[adzuna] ${res.status} for ${args.role} @ ${args.location || "any"}: ${message}`
      );
      return [];
    }
    const data = (await res.json()) as AdzunaResult;
    const listings: RawJobCandidate[] = [];
    for (const item of data.results ?? []) {
      if (!item.title || !item.redirect_url) continue;
      const blob = `${item.title} ${item.description ?? ""}`;
      const postedAs = item.company?.display_name || "Unknown";
      listings.push({
        title: item.title,
        company: resolveEmployerCompany({
          postedAs,
          title: item.title,
          description: item.description,
        }),
        description: item.description,
        sourceUrl: item.redirect_url,
        location: item.location?.display_name || args.location || "India",
        workMode: inferWorkMode(blob),
        salaryEstimateMin: item.salary_min,
        salaryEstimateMax: item.salary_max,
        source: "adzuna",
      });
    }
    return listings;
  } catch (err) {
    console.warn("[adzuna] fetch failed", err);
    return [];
  }
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
      ? profile.rolesOfInterest.slice(0, 3)
      : ["software engineer"];

  const locations =
    profile.workMode === "remote"
      ? [""]
      : profile.preferredLocations.length > 0
        ? profile.preferredLocations.slice(0, 2)
        : ["Bengaluru"];

  const queries = roles.flatMap((role) =>
    locations.map((location) => ({ role, location }))
  );

  const pages = await Promise.all(
    queries.map(({ role, location }) =>
      fetchAdzunaPage({
        appId,
        appKey,
        role,
        location,
        salaryMin: profile.salaryExpectationMin,
      })
    )
  );

  const listings = pages.flat();

  // Re-apply profile remote preference if Adzuna text didn't hint at mode
  if (profile.workMode === "remote") {
    for (const item of listings) {
      if (!item.workMode) item.workMode = "remote";
    }
  }

  return listings;
}
