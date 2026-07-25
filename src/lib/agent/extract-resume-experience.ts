import { generateJson } from "@/lib/agent/gemini";
import type { EmploymentType } from "@/models/User";

export type ResumeRoleSpan = {
  company: string;
  title: string;
  dates: string;
  months: number;
  employmentType: EmploymentType;
};

export type ResumeExperience = {
  /** Full-time / permanent only, overlapping roles counted once. */
  fullTimeMonths: number;
  fullTimeYears: number;
  internshipMonths: number;
  roles: ResumeRoleSpan[];
};

const FULL_TIME_TYPES = new Set<EmploymentType>(["full-time", "permanent"]);

const EMPLOYMENT_ALIASES: Record<string, EmploymentType> = {
  "full-time": "full-time",
  fulltime: "full-time",
  "full time": "full-time",
  permanent: "permanent",
  contract: "contract",
  contractor: "contract",
  "part-time": "part-time",
  "part time": "part-time",
  internship: "internship",
  intern: "internship",
  freelance: "freelance",
  consultant: "freelance",
};

function normalizeEmploymentType(raw: unknown): EmploymentType {
  const key = String(raw ?? "")
    .trim()
    .toLowerCase();
  return EMPLOYMENT_ALIASES[key] ?? "other";
}

/** "2021-03" | "2021" | "present" → month index, or null when unparseable. */
function toMonthIndex(raw: unknown): number | null {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!value) return null;
  if (/^(present|current|now|ongoing)$/.test(value)) {
    const now = new Date();
    return now.getFullYear() * 12 + now.getMonth();
  }

  const withMonth = value.match(/^(\d{4})-(\d{1,2})$/);
  if (withMonth) {
    const year = Number(withMonth[1]);
    const month = Math.min(12, Math.max(1, Number(withMonth[2])));
    return year * 12 + (month - 1);
  }

  const yearOnly = value.match(/^(\d{4})$/);
  if (yearOnly) return Number(yearOnly[1]) * 12;

  return null;
}

/** Union of month ranges so parallel/overlapping roles aren't double counted. */
function mergedMonths(spans: Array<{ start: number; end: number }>): number {
  if (spans.length === 0) return 0;
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  let total = 0;
  let { start, end } = sorted[0];

  for (const span of sorted.slice(1)) {
    if (span.start <= end) {
      end = Math.max(end, span.end);
      continue;
    }
    total += end - start;
    start = span.start;
    end = span.end;
  }

  return total + (end - start);
}

/**
 * Reads employment history off the resume and totals only full-time /
 * permanent tenure. Internships, part-time, freelance and contract gigs are
 * tracked separately so they never inflate the headline number.
 */
export async function extractResumeExperience(
  resumeText: string
): Promise<ResumeExperience> {
  const today = new Date().toISOString().slice(0, 7);

  const result = await generateJson<{
    roles: Array<{
      company: string;
      title: string;
      startDate: string;
      endDate: string;
      employmentType: string;
      months?: number;
    }>;
    totalFullTimeMonths?: number;
  }>({
    label: "extractResumeExperience",
    temperature: 0.1,
    system:
      "You extract employment history from resumes. Use only what the resume states — never guess dates or invent roles. Respond with valid JSON only.",
    prompt: `Extract every work position from this resume. Today is ${today}.

Classify employmentType exactly as one of:
"full-time", "permanent", "contract", "part-time", "internship", "freelance", "other".

Rules:
- Treat a role as "full-time" when the resume shows it as a regular salaried job (no intern/part-time/freelance wording).
- Use "internship" for internships, trainee, co-op or apprentice stints.
- Dates as "YYYY-MM" when the month is known, else "YYYY". Use "present" for ongoing roles.
- Skip education entries, awards, and personal projects that are not employment.

Resume text:
${resumeText.slice(0, 20000)}

Return JSON:
{
  "roles": [
    {
      "company": string,
      "title": string,
      "startDate": "YYYY-MM" | "YYYY",
      "endDate": "YYYY-MM" | "YYYY" | "present",
      "employmentType": string,
      "months": number (your own estimate of duration)
    }
  ],
  "totalFullTimeMonths": number (full-time + permanent only)
}`,
  });

  const rawRoles = Array.isArray(result.roles) ? result.roles : [];
  const roles: ResumeRoleSpan[] = [];
  const fullTimeSpans: Array<{ start: number; end: number }> = [];
  let internshipMonths = 0;
  let fullTimeMonthsFallback = 0;

  for (const role of rawRoles.slice(0, 20)) {
    const employmentType = normalizeEmploymentType(role?.employmentType);
    const start = toMonthIndex(role?.startDate);
    const end = toMonthIndex(role?.endDate);
    const estimated = Number(role?.months);

    const spanMonths =
      start != null && end != null && end >= start
        ? end - start
        : Number.isFinite(estimated) && estimated > 0
          ? Math.round(estimated)
          : 0;

    const startLabel = String(role?.startDate ?? "").trim();
    const endLabel = String(role?.endDate ?? "").trim();

    roles.push({
      company: String(role?.company ?? "").trim(),
      title: String(role?.title ?? "").trim(),
      dates: [startLabel, endLabel].filter(Boolean).join(" – "),
      months: spanMonths,
      employmentType,
    });

    if (FULL_TIME_TYPES.has(employmentType)) {
      if (start != null && end != null && end >= start) {
        fullTimeSpans.push({ start, end });
      } else {
        fullTimeMonthsFallback += spanMonths;
      }
    } else if (employmentType === "internship") {
      internshipMonths += spanMonths;
    }
  }

  const computed = mergedMonths(fullTimeSpans) + fullTimeMonthsFallback;
  const modelTotal = Number(result.totalFullTimeMonths);
  const fullTimeMonths =
    computed > 0
      ? computed
      : Number.isFinite(modelTotal) && modelTotal > 0
        ? Math.round(modelTotal)
        : 0;

  return {
    fullTimeMonths,
    fullTimeYears: Math.round((fullTimeMonths / 12) * 10) / 10,
    internshipMonths,
    roles: roles.filter((r) => r.company || r.title),
  };
}
