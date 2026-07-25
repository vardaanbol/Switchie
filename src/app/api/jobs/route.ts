import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import JobListing, { JOB_STATUSES } from "@/models/JobListing";
import { WORK_MODES } from "@/models/User";
import { mapDashboardJob } from "@/lib/jobs/dashboard-job";
import { filterJobsByExperience } from "@/lib/jobs/experience-filter";
import {
  isStaffingAgencyName,
  resolveEmployerCompany,
} from "@/lib/jobs/resolve-employer";

export async function GET(req: Request) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user } = result;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const workMode = searchParams.get("workMode");
  const location = searchParams.get("location");
  const salaryMin = searchParams.get("salaryMin");
  const salaryMax = searchParams.get("salaryMax");

  const query: Record<string, unknown> = { userId: user._id };

  if (status && JOB_STATUSES.includes(status as (typeof JOB_STATUSES)[number])) {
    query.status = status;
  }
  if (workMode && WORK_MODES.includes(workMode as (typeof WORK_MODES)[number])) {
    query.workMode = workMode;
  }
  if (location) {
    query.location = { $regex: location, $options: "i" };
  }
  if (salaryMin || salaryMax) {
    const salaryFilter: Record<string, number> = {};
    if (salaryMin) salaryFilter.$gte = Number(salaryMin);
    if (salaryMax) salaryFilter.$lte = Number(salaryMax);
    query.salaryEstimateMax = salaryFilter;
  }

  const jobs = await JobListing.find(query)
    .sort({ matchScore: -1, foundAt: -1 })
    .lean();

  // Persist employer fixes for agency-posted rows so referrals use the real company.
  const repairs = jobs.flatMap((job) => {
    if (!isStaffingAgencyName(job.company) && job.company !== "Unknown") {
      return [];
    }
    const fixed = resolveEmployerCompany({
      postedAs: job.company,
      title: job.title,
      description: job.description ?? "",
    });
    if (!fixed || fixed === job.company) return [];
    return [
      JobListing.updateOne(
        { _id: job._id },
        { $set: { company: fixed } }
      ).then(() => {
        job.company = fixed;
      }),
    ];
  });
  if (repairs.length > 0) {
    await Promise.allSettled(repairs);
  }

  const mapped = jobs.map(mapDashboardJob);
  const candidateYears =
    typeof user.profile?.resumeExperienceYears === "number"
      ? user.profile.resumeExperienceYears
      : null;

  return NextResponse.json({
    jobs: filterJobsByExperience(mapped, candidateYears, 2),
    resumeExperienceYears: candidateYears,
  });
}
