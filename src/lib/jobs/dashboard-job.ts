import type { JobStatus, WorkMode } from "@/models";
import { resolveEmployerCompany, isStaffingAgencyName } from "@/lib/jobs/resolve-employer";

export type DashboardJob = {
  _id: string;
  title: string;
  company: string;
  description: string;
  sourceUrl: string;
  location?: string;
  workMode?: WorkMode;
  salaryEstimateMin?: number;
  salaryEstimateMax?: number;
  salaryIsEstimate?: boolean;
  pros: string[];
  cons: string[];
  referralContacts: Array<{
    name: string;
    title: string;
    company: string;
    profileUrl: string;
    confidence?: number;
  }>;
  matchScore: number;
  status: JobStatus;
  foundAt: string;
  savedAt?: string | null;
  appliedAt?: string | null;
  resumeMatchScore?: number | null;
  resumeMatchGaps?: string[];
  resumeMatchExperienceYears?: number | null;
  resumeMatchRequiredYears?: number | null;
  requiredExperienceYears?: number | null;
  resumeMatchExperienceVerdict?: string | null;
  resumeMatchAt?: string | null;
  enhancedResumeTex?: string | null;
  enhancedResumeMarkdown?: string | null;
  enhancedResumeAtsTips?: string[];
  enhancedResumeAdditions?: string[];
  enhancedResumeStillMissing?: string[];
  enhancedResumeAt?: string | null;
};

export function mapDashboardJob(job: {
  _id: { toString(): string };
  title: string;
  company: string;
  description?: string | null;
  sourceUrl: string;
  location?: string | null;
  workMode?: WorkMode | null;
  salaryEstimateMin?: number | null;
  salaryEstimateMax?: number | null;
  salaryIsEstimate?: boolean | null;
  pros?: string[] | null;
  cons?: string[] | null;
  referralContacts?: ReadonlyArray<{
    name: string;
    title: string;
    company: string;
    profileUrl: string;
    confidence?: number | null;
  }> | null;
  matchScore: number;
  status: JobStatus;
  foundAt?: Date | string | null;
  savedAt?: Date | string | null;
  appliedAt?: Date | string | null;
  resumeMatchScore?: number | null;
  resumeMatchGaps?: string[] | null;
  resumeMatchExperienceYears?: number | null;
  resumeMatchRequiredYears?: number | null;
  requiredExperienceYears?: number | null;
  resumeMatchExperienceVerdict?: string | null;
  resumeMatchAt?: Date | string | null;
  enhancedResumeTex?: string | null;
  enhancedResumeMarkdown?: string | null;
  enhancedResumeAtsTips?: string[] | null;
  enhancedResumeAdditions?: string[] | null;
  enhancedResumeStillMissing?: string[] | null;
  enhancedResumeAt?: Date | string | null;
}): DashboardJob {
  // Repair already-saved agency posters using description heuristics.
  const company =
    isStaffingAgencyName(job.company) || job.company === "Unknown"
      ? resolveEmployerCompany({
          postedAs: job.company,
          title: job.title,
          description: job.description ?? "",
        })
      : job.company;

  return {
    _id: job._id.toString(),
    title: job.title,
    company,
    description: job.description ?? "",
    sourceUrl: job.sourceUrl,
    location: job.location ?? undefined,
    workMode: job.workMode ?? undefined,
    salaryEstimateMin: job.salaryEstimateMin ?? undefined,
    salaryEstimateMax: job.salaryEstimateMax ?? undefined,
    salaryIsEstimate: job.salaryIsEstimate ?? true,
    pros: job.pros ?? [],
    cons: job.cons ?? [],
    referralContacts: (job.referralContacts ?? []).map((c) => ({
      name: c.name,
      title: c.title,
      company: c.company,
      profileUrl: c.profileUrl,
      confidence: c.confidence ?? undefined,
    })),
    matchScore: job.matchScore,
    status: job.status,
    foundAt: (job.foundAt ? new Date(job.foundAt) : new Date()).toISOString(),
    savedAt: job.savedAt ? new Date(job.savedAt).toISOString() : null,
    appliedAt: job.appliedAt ? new Date(job.appliedAt).toISOString() : null,
    resumeMatchScore:
      typeof job.resumeMatchScore === "number" ? job.resumeMatchScore : null,
    resumeMatchGaps: job.resumeMatchGaps ?? [],
    resumeMatchExperienceYears:
      typeof job.resumeMatchExperienceYears === "number"
        ? job.resumeMatchExperienceYears
        : null,
    resumeMatchRequiredYears:
      typeof job.resumeMatchRequiredYears === "number"
        ? job.resumeMatchRequiredYears
        : null,
    requiredExperienceYears:
      typeof job.requiredExperienceYears === "number"
        ? job.requiredExperienceYears
        : null,
    resumeMatchExperienceVerdict: job.resumeMatchExperienceVerdict ?? null,
    resumeMatchAt: job.resumeMatchAt
      ? new Date(job.resumeMatchAt).toISOString()
      : null,
    enhancedResumeTex: job.enhancedResumeTex ?? null,
    enhancedResumeMarkdown: job.enhancedResumeMarkdown ?? null,
    enhancedResumeAtsTips: job.enhancedResumeAtsTips ?? [],
    enhancedResumeAdditions: job.enhancedResumeAdditions ?? [],
    enhancedResumeStillMissing: job.enhancedResumeStillMissing ?? [],
    enhancedResumeAt: job.enhancedResumeAt
      ? new Date(job.enhancedResumeAt).toISOString()
      : null,
  };
}

export function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDayLabel(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function isValidDayParam(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}
