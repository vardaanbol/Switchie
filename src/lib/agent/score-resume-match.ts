import { generateJson } from "@/lib/agent/gemini";
import type { ResumeRoleSpan } from "@/lib/agent/extract-resume-experience";

export type ExperienceVerdict = "meets" | "exceeds" | "below" | "unclear";

export type ResumeMatchResult = {
  score: number;
  gaps: string[];
  strengths: string[];
  keywordHits: string[];
  /** Full-time years the JD asks for, per the model. */
  requiredYears: number | null;
  experienceVerdict: ExperienceVerdict;
};

const VERDICTS = new Set<ExperienceVerdict>([
  "meets",
  "exceeds",
  "below",
  "unclear",
]);

function experienceContext(opts: {
  experienceYears?: number | null;
  roles?: ResumeRoleSpan[];
}): string {
  if (typeof opts.experienceYears !== "number") {
    return "- Full-time experience: could not be parsed; judge from the resume text itself.";
  }

  const fullTimeRoles = (opts.roles ?? [])
    .filter((r) => r.employmentType === "full-time" || r.employmentType === "permanent")
    .slice(0, 8)
    .map(
      (r) =>
        `  · ${r.title || "Role"} at ${r.company || "company"} (${r.dates || "dates n/a"}, ~${r.months} months)`
    );

  const internships = (opts.roles ?? []).filter(
    (r) => r.employmentType === "internship"
  ).length;

  return [
    `- Full-time / permanent experience: ${opts.experienceYears} years (internships excluded).`,
    internships > 0
      ? `- Internships on the resume: ${internships} (do not count toward the years above).`
      : null,
    fullTimeRoles.length > 0 ? `- Full-time roles:\n${fullTimeRoles.join("\n")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function scoreResumeMatch(opts: {
  resumeText: string;
  jobTitle: string;
  company: string;
  description: string;
  experienceYears?: number | null;
  roles?: ResumeRoleSpan[];
}): Promise<ResumeMatchResult> {
  const result = await generateJson<{
    score: number;
    gaps: string[];
    strengths: string[];
    keywordHits: string[];
    requiredYears: number | null;
    experienceVerdict: string;
  }>({
    label: "scoreResumeMatch",
    temperature: 0.2,
    system:
      "You score how well a candidate resume matches a job description for ATS keyword fit and years of relevant full-time experience. Respond with valid JSON only. Be honest — do not invent resume content.",
    prompt: `Score resume-vs-JD match for ATS and hiring fit (0–100).

Job:
- Title: ${opts.jobTitle}
- Company: ${opts.company}
- Description:
${opts.description.slice(0, 6000)}

Candidate experience (parsed from the resume):
${experienceContext(opts)}

Resume text:
${opts.resumeText.slice(0, 20000)}

Return JSON:
{
  "score": number 0-100,
  "gaps": string[] (JD requirements missing or weak on the resume; max 8),
  "strengths": string[] (clear alignments; max 6),
  "keywordHits": string[] (JD keywords/phrases present on the resume; max 12),
  "requiredYears": number|null (full-time years the JD asks for; null if unstated),
  "experienceVerdict": "meets" | "exceeds" | "below" | "unclear"
}

Scoring guide:
- Weight two things: (a) relevant full-time experience vs what the JD requires, (b) ATS keyword/skill coverage.
- If the candidate's full-time years are clearly below the JD requirement, cap the score below 70 and add a gap naming the shortfall.
- 90–100: meets the years requirement AND strong keyword coverage
- 70–89: enough experience but missing some keywords or emphasis
- below 70: short on years or significant skill gaps
- Count only full-time/permanent tenure toward years; internships and freelance work belong in strengths, not the years total.
Only judge what appears in the resume text.`,
  });

  const requiredYears = Number(result.requiredYears);
  const verdict = String(result.experienceVerdict ?? "").toLowerCase();

  return {
    score: Math.max(0, Math.min(100, Math.round(result.score ?? 0))),
    gaps: (result.gaps ?? [])
      .map((g) => String(g).trim())
      .filter(Boolean)
      .slice(0, 8),
    strengths: (result.strengths ?? [])
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 6),
    keywordHits: (result.keywordHits ?? [])
      .map((k) => String(k).trim())
      .filter(Boolean)
      .slice(0, 12),
    requiredYears:
      Number.isFinite(requiredYears) && requiredYears >= 0 ? requiredYears : null,
    experienceVerdict: VERDICTS.has(verdict as ExperienceVerdict)
      ? (verdict as ExperienceVerdict)
      : "unclear",
  };
}
