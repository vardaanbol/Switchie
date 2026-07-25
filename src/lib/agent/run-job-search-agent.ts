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

  const enrichedListings = [];
  for (const candidate of candidates) {
    try {
      const enrichedItem = await enrichListing(candidate, profile);
      enrichedListings.push(enrichedItem);
      enriched += 1;
    } catch (err) {
      console.warn("[agent] enrich failed", candidate.title, err);
    }
  }

  enrichedListings.sort((a, b) => b.matchScore - a.matchScore);

  for (let i = 0; i < enrichedListings.length; i++) {
    const item = enrichedListings[i];
    let referralContacts: Awaited<ReturnType<typeof findReferralContacts>> = [];
    if (i < REFERRAL_TOP_N) {
      try {
        referralContacts = await findReferralContacts({
          company: item.company,
          roleTitle: item.title,
        });
      } catch (err) {
        console.warn("[agent] referrals failed", item.company, err);
      }
    }

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
