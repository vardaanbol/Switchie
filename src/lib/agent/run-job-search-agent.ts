import { connectDB } from "@/lib/db/mongodb";
import User from "@/models/User";
import JobListing from "@/models/JobListing";
import { searchAdzunaJobs } from "@/lib/agent/adzuna";
import { searchJobsViaGrounding } from "@/lib/agent/search-jobs-via-grounding";
import { enrichListing } from "@/lib/agent/enrich-listing";
import { findReferralContacts } from "@/lib/agent/find-referral-contacts";
import { dedupeByTitleCompanyLocation } from "@/lib/agent/dedupe";
import type { UserProfileContext } from "@/lib/agent/search-jobs-via-grounding";

const REFERRAL_TOP_N = 5;
const MAX_ENRICH = 12;
const CONCURRENCY = 4;

/** Run tasks with a concurrency cap to stay under Gemini rate limits. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { status: "fulfilled", value: await fn(items[index]) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
}

export type AgentRunResult = {
  fetched: number;
  saved: number;
  skippedDuplicates: number;
  enriched: number;
};

export async function runJobSearchAgent(userId: string): Promise<AgentRunResult> {
  await connectDB();
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const profile: UserProfileContext = {
    name: user.name,
    salaryExpectationMin: user.profile?.salaryExpectationMin ?? undefined,
    salaryExpectationMax: user.profile?.salaryExpectationMax ?? undefined,
    workMode: user.profile?.workMode ?? undefined,
    preferredLocations: user.profile?.preferredLocations ?? [],
    rolesOfInterest: user.profile?.rolesOfInterest ?? [],
    resumeParsedSkills: user.profile?.resumeParsedSkills ?? [],
  };

  if (profile.rolesOfInterest.length === 0) {
    throw new Error("Complete your profile roles before searching");
  }

  const [adzuna, grounded] = await Promise.all([
    searchAdzunaJobs(profile),
    searchJobsViaGrounding(profile).catch((err) => {
      console.warn("[agent] grounding search failed", err);
      return [];
    }),
  ]);

  const merged = dedupeByTitleCompanyLocation([...adzuna, ...grounded]);
  const toEnrich = merged.slice(0, MAX_ENRICH);

  let saved = 0;
  let skippedDuplicates = 0;
  let enriched = 0;

  const existingUrls = new Set(
    (
      await JobListing.find({ userId: user._id })
        .select("sourceUrl")
        .lean()
    ).map((j) => j.sourceUrl)
  );

  const candidates = toEnrich.filter((j) => {
    if (existingUrls.has(j.sourceUrl)) {
      skippedDuplicates += 1;
      return false;
    }
    return true;
  });

  const enrichResults = await mapWithConcurrency(candidates, CONCURRENCY, (c) =>
    enrichListing(c, profile)
  );

  const enrichedListings = enrichResults.flatMap((r, i) => {
    if (r.status === "fulfilled") return [r.value];
    console.warn("[agent] enrich failed", candidates[i].title, r.reason);
    return [];
  });
  enriched = enrichedListings.length;

  enrichedListings.sort((a, b) => b.matchScore - a.matchScore);

  // Referral lookups only for the top N by match score, in parallel
  const referralTargets = enrichedListings.slice(0, REFERRAL_TOP_N);
  const referralResults = await mapWithConcurrency(
    referralTargets,
    CONCURRENCY,
    (item) => findReferralContacts({ company: item.company, roleTitle: item.title })
  );

  const referralsByIndex = referralResults.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    console.warn("[agent] referrals failed", referralTargets[i].company, r.reason);
    return [];
  });

  for (let i = 0; i < enrichedListings.length; i++) {
    const item = enrichedListings[i];
    const referralContacts = i < REFERRAL_TOP_N ? referralsByIndex[i] ?? [] : [];

    try {
      await JobListing.create({
        userId: user._id,
        title: item.title,
        company: item.company,
        description: item.description,
        sourceUrl: item.sourceUrl,
        location: item.location,
        workMode: item.workMode,
        salaryEstimateMin: item.salaryEstimateMin,
        salaryEstimateMax: item.salaryEstimateMax,
        salaryIsEstimate: item.salaryIsEstimate,
        pros: item.pros,
        cons: item.cons,
        referralContacts,
        matchScore: item.matchScore,
        foundAt: new Date(),
        status: "new",
      });
      saved += 1;
    } catch (err) {
      // Unique index collision
      skippedDuplicates += 1;
      console.warn("[agent] save skipped", item.sourceUrl, err);
    }
  }

  return {
    fetched: merged.length,
    saved,
    skippedDuplicates,
    enriched,
  };
}
