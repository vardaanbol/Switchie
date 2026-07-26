import { connectDB } from "@/lib/db/mongodb";
import User from "@/models/User";
import JobListing from "@/models/JobListing";
import { searchAdzunaJobs } from "@/lib/agent/adzuna";
import { searchJobsViaGrounding } from "@/lib/agent/search-jobs-via-grounding";
import { enrichListing, withinExperienceWindow } from "@/lib/agent/enrich-listing";
import { findReferralContacts } from "@/lib/agent/find-referral-contacts";
import { capPerCompany, dedupeByTitleCompanyLocation } from "@/lib/agent/dedupe";
import type { UserProfileContext } from "@/lib/agent/search-jobs-via-grounding";

/** Fewer enrich calls = biggest wall-clock win (each is a Gemini round-trip). */
const MAX_ENRICH = 8;
const CONCURRENCY = 6;
/** Keeps one staffing agency from spending the whole enrichment budget. */
const MAX_PER_COMPANY = 2;

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
  /** IDs of newly saved top matches — used to fill referrals in the background. */
  referralJobIds: string[];
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
    resumeExperienceYears:
      typeof user.profile?.resumeExperienceYears === "number"
        ? user.profile.resumeExperienceYears
        : undefined,
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

  let skippedDuplicates = 0;
  let enriched = 0;

  const existingUrls = new Set(
    (
      await JobListing.find({ userId: user._id })
        .select("sourceUrl")
        .lean()
    ).map((j) => j.sourceUrl)
  );

  // Remove known jobs before applying the enrichment cap. Slicing first meant
  // eight duplicate results could hide dozens of fresh candidates behind them.
  const freshCandidates = merged.filter((job) => {
    const isDuplicate = existingUrls.has(job.sourceUrl);
    if (isDuplicate) skippedDuplicates += 1;
    return !isDuplicate;
  });
  const candidates = capPerCompany(freshCandidates, MAX_PER_COMPANY).slice(
    0,
    MAX_ENRICH
  );

  const enrichResults = await mapWithConcurrency(candidates, CONCURRENCY, (c) =>
    enrichListing(c, profile)
  );

  const enrichedListings = enrichResults.flatMap((r, i) => {
    if (r.status === "fulfilled") return [r.value];
    console.warn("[agent] enrich failed", candidates[i].title, r.reason);
    return [];
  });

  // Drop roles whose experience band is more than ±2 years from the resume.
  const experienceFiltered = enrichedListings.filter((item) =>
    withinExperienceWindow(
      item.requiredExperienceYears,
      profile.resumeExperienceYears,
      2
    )
  );
  const skippedExperience =
    enrichedListings.length - experienceFiltered.length;
  if (skippedExperience > 0) {
    console.info(
      `[agent] skipped ${skippedExperience} jobs outside ±2y experience window (candidate=${profile.resumeExperienceYears ?? "n/a"}y)`
    );
  }
  enriched = experienceFiltered.length;

  experienceFiltered.sort((a, b) => b.matchScore - a.matchScore);

  // Save immediately without waiting on slow grounded referral lookups
  const docs = experienceFiltered.map((item) => ({
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
    referralContacts: [],
    matchScore: item.matchScore,
    requiredExperienceYears: item.requiredExperienceYears ?? undefined,
    foundAt: new Date(),
    status: "new" as const,
  }));

  let saved = 0;
  const referralJobIds: string[] = [];

  if (docs.length > 0) {
    try {
      const inserted = await JobListing.insertMany(docs, { ordered: false });
      saved = inserted.length;
      for (const doc of inserted) {
        referralJobIds.push(doc._id.toString());
      }
    } catch (err: unknown) {
      // Partial success with duplicate-key errors (ordered: false)
      const bulk = err as {
        insertedDocs?: Array<{ _id: { toString(): string } }>;
        writeErrors?: unknown[];
      };
      if (Array.isArray(bulk.insertedDocs) && bulk.insertedDocs.length > 0) {
        saved = bulk.insertedDocs.length;
        for (const doc of bulk.insertedDocs) {
          referralJobIds.push(doc._id.toString());
        }
        skippedDuplicates += docs.length - saved;
      } else {
        // Fallback: insert one-by-one so one collision doesn't sink the batch
        for (const doc of docs) {
          try {
            const created = await JobListing.create(doc);
            saved += 1;
            referralJobIds.push(created._id.toString());
          } catch {
            skippedDuplicates += 1;
          }
        }
      }
    }
  }

  return {
    fetched: merged.length,
    saved,
    skippedDuplicates,
    enriched,
    referralJobIds,
  };
}

/** Fill referral contacts for saved jobs (run after the HTTP response via `after`). */
export async function fillReferralsForJobs(jobIds: string[]): Promise<void> {
  if (jobIds.length === 0) return;

  await connectDB();
  const jobs = await JobListing.find({ _id: { $in: jobIds } })
    .select("_id company title")
    .lean();

  if (jobs.length === 0) return;

  // One grounded search per company — reuse across roles at the same org
  const byCompany = new Map<string, typeof jobs>();
  for (const job of jobs) {
    const key = job.company.trim().toLowerCase();
    const list = byCompany.get(key) ?? [];
    list.push(job);
    byCompany.set(key, list);
  }

  const companyEntries = [...byCompany.entries()];
  const companyResults = await mapWithConcurrency(
    companyEntries,
    Math.min(CONCURRENCY, 4),
    async ([, companyJobs]) => {
      const representative = companyJobs[0];
      const contacts = await findReferralContacts({
        company: representative.company,
        roleTitle: representative.title,
      });
      return { jobIds: companyJobs.map((j) => j._id.toString()), contacts };
    }
  );

  await Promise.all(
    companyResults.map(async (r, i) => {
      if (r.status !== "fulfilled") {
        console.warn(
          "[agent] referrals failed",
          companyEntries[i][1][0]?.company,
          r.reason
        );
        return;
      }
      const { jobIds: ids, contacts } = r.value;
      await Promise.all(
        ids.map((id) =>
          JobListing.updateOne(
            { _id: id },
            { $set: { referralContacts: contacts } }
          )
        )
      );
    })
  );
}
