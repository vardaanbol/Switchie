import type { JobStatus, WorkMode } from "@/models";

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
}): DashboardJob {
  return {
    _id: job._id.toString(),
    title: job.title,
    company: job.company,
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
