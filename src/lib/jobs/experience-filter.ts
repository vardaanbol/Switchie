import { withinExperienceWindow } from "@/lib/agent/enrich-listing";
import type { DashboardJob } from "@/lib/jobs/dashboard-job";

/**
 * Experience band for the feed: keep only jobs whose JD years are within
 * ±window of the candidate's full-time years.
 */
export function filterJobsByExperience(
  jobs: DashboardJob[],
  candidateYears: number | null | undefined,
  window = 2
): DashboardJob[] {
  if (typeof candidateYears !== "number") return jobs;

  return jobs.filter((job) => {
    // Explicit user intent outranks the heuristic — a job someone saved or
    // applied to (including one shared by another Yawner) must stay visible.
    if (job.status === "saved" || job.status === "applied") return true;

    const required =
      typeof job.requiredExperienceYears === "number"
        ? job.requiredExperienceYears
        : typeof job.resumeMatchRequiredYears === "number"
          ? job.resumeMatchRequiredYears
          : null;

    if (required != null) {
      return withinExperienceWindow(required, candidateYears, window);
    }

    // Already scored as below the JD → hide even without a numeric years field.
    if (job.resumeMatchExperienceVerdict === "below") return false;

    return true;
  });
}
