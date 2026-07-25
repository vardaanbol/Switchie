import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import JobListing, { JOB_STATUSES } from "@/models/JobListing";
import { WORK_MODES } from "@/models/User";

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

  const jobs = await JobListing.find(query).sort({ matchScore: -1, foundAt: -1 }).lean();

  return NextResponse.json({
    jobs: jobs.map((job) => ({
      ...job,
      _id: job._id.toString(),
      userId: job.userId.toString(),
      foundAt: job.foundAt
        ? new Date(job.foundAt).toISOString()
        : new Date().toISOString(),
      savedAt: job.savedAt ? new Date(job.savedAt).toISOString() : null,
      appliedAt: job.appliedAt ? new Date(job.appliedAt).toISOString() : null,
    })),
  });
}
