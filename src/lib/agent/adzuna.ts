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

const RESULTS_PER_PAGE = 50;
const PAGES_PER_QUERY = 2;
const MAX_DAYS_OLD = 21;

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
  page: number;
}): Promise<RawJobCandidate[]> {
  const params = new URLSearchParams({
    app_id: args.appId,
    app_key: args.appKey,
    results_per_page: String(RESULTS_PER_PAGE),
    what: args.role,
    // Adzuna's default relevance ranking returns the same block of
    // aggregator-fed listings for generic role queries, so a single feed
    // partner ends up owning the whole batch. Date order rotates the inventory.
    sort_by: "date",
    max_days_old: String(MAX_DAYS_OLD),
  });
  if (args.location) params.set("where", args.location);

  const url = `https://api.adzuna.com/v1/api/jobs/in/search/${args.page}?${params}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      const message = (await res.text()).slice(0, 300);
      console.warn(
        `[adzuna] ${res.status} for ${args.role} @ ${args.location || "any"} (p${args.page}): ${message}`
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

/** Round-robin across buckets so the first bucket doesn't own the head of the list. */
function interleave<T>(buckets: T[][]): T[] {
  const out: T[] = [];
  const longest = Math.max(0, ...buckets.map((b) => b.length));
  for (let i = 0; i < longest; i += 1) {
    for (const bucket of buckets) {
      if (i < bucket.length) out.push(bucket[i]);
    }
  }
  return out;
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

  // Each query contributes its own bucket so one role/location can't flood the
  // batch once the caller applies its enrichment cap.
  const buckets = await Promise.all(
    queries.map(async ({ role, location }) => {
      const pages = await Promise.all(
        Array.from({ length: PAGES_PER_QUERY }, (_, i) =>
          fetchAdzunaPage({ appId, appKey, role, location, page: i + 1 })
        )
      );
      return pages.flat();
    })
  );

  const listings = interleave(buckets);

  // Re-apply profile remote preference if Adzuna text didn't hint at mode
  if (profile.workMode === "remote") {
    for (const item of listings) {
      if (!item.workMode) item.workMode = "remote";
    }
  }

  return listings;
}
