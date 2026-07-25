import { generateJson } from "@/lib/agent/gemini";
import type { ResumeRoleSpan } from "@/lib/agent/extract-resume-experience";
import {
  fillAtsLatexTemplate,
  sectionsToMarkdown,
  type AtsResumeSections,
} from "@/lib/resume/fill-ats-template";

export type EnhanceResumeResult = {
  sections: AtsResumeSections;
  latex: string;
  markdown: string;
  estimatedAtsScore: number;
  /** Concrete JD-aligned changes the user will see on the new resume. */
  additions: string[];
  /** JD requirements we did not invent because they aren't on the resume. */
  stillMissing: string[];
  changesSummary: string[];
  atsTips: string[];
};

function asStringArray(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => String(x ?? "").trim())
    .filter(Boolean)
    .slice(0, max);
}

function normalizeSections(raw: Partial<AtsResumeSections>): AtsResumeSections {
  return {
    name: String(raw.name ?? "Candidate").trim() || "Candidate",
    contact: String(raw.contact ?? "").trim(),
    summary: String(raw.summary ?? "").trim(),
    skills: asStringArray(raw.skills, 40),
    experience: (Array.isArray(raw.experience) ? raw.experience : [])
      .slice(0, 8)
      .map((job) => ({
        company: String(job?.company ?? "").trim(),
        title: String(job?.title ?? "").trim(),
        dates: String(job?.dates ?? "").trim(),
        bullets: asStringArray(job?.bullets, 6),
      }))
      .filter((j) => j.company || j.title),
    education: (Array.isArray(raw.education) ? raw.education : [])
      .slice(0, 4)
      .map((ed) => ({
        school: String(ed?.school ?? "").trim(),
        degree: String(ed?.degree ?? "").trim(),
        dates: String(ed?.dates ?? "").trim(),
        details: ed?.details ? String(ed.details).trim() : undefined,
      }))
      .filter((e) => e.school || e.degree),
    projects: (Array.isArray(raw.projects) ? raw.projects : [])
      .slice(0, 5)
      .map((p) => ({
        name: String(p?.name ?? "").trim(),
        dates: p?.dates ? String(p.dates).trim() : undefined,
        bullets: asStringArray(p?.bullets, 4),
      }))
      .filter((p) => p.name),
  };
}

export async function enhanceResumeForJob(opts: {
  resumeText: string;
  jobTitle: string;
  company: string;
  description: string;
  gaps?: string[];
  experienceYears?: number | null;
  roles?: ResumeRoleSpan[];
}): Promise<EnhanceResumeResult> {
  const gapsLine =
    opts.gaps && opts.gaps.length > 0
      ? opts.gaps.join("; ")
      : "infer from JD vs resume";

  const experienceLine =
    typeof opts.experienceYears === "number"
      ? `- Verified full-time / permanent experience: ${opts.experienceYears} years (internships excluded). State this figure in the summary; never inflate it.`
      : "- Full-time experience could not be parsed; do not state a years figure in the summary.";

  const result = await generateJson<{
    name: string;
    contact: string;
    summary: string;
    skills: string[];
    experience: Array<{
      company: string;
      title: string;
      dates: string;
      bullets: string[];
    }>;
    education: Array<{
      school: string;
      degree: string;
      dates: string;
      details?: string;
    }>;
    projects: Array<{
      name: string;
      dates?: string;
      bullets: string[];
    }>;
    estimatedAtsScore: number;
    additions: string[];
    stillMissing: string[];
    changesSummary: string[];
    atsTips: string[];
  }>({
    label: "enhanceResume",
    temperature: 0.35,
    system: `You rewrite resumes for ATS parseability and keyword alignment with a specific JD.
Rules:
- Use ONLY facts from the resume. Never invent employers, titles, dates, degrees, metrics, or skills the candidate does not have.
- You may reorder, rephrase, and emphasize true experience; mirror JD wording for skills the candidate already has.
- If a JD skill is missing, omit it from Skills and list it in stillMissing — do not fake it.
- Skills must be a flat comma-friendly list of real keywords.
- "additions" must be concrete, user-facing explanations of what is newly emphasized or clearer on the enhanced resume for THIS JD (keywords surfaced, bullets reframed, summary focus, section order). Not vague ("improved ATS").
Respond with valid JSON only.`,
    prompt: `Create an ATS-optimized resume rewrite for this job.

Job:
- Title: ${opts.jobTitle}
- Company: ${opts.company}
- Known gaps to address honestly (do not invent): ${gapsLine}
- Description:
${opts.description.slice(0, 6000)}

Candidate experience (parsed from the resume):
${experienceLine}

Resume text (source of truth):
${opts.resumeText.slice(0, 20000)}

Return JSON:
{
  "name": string,
  "contact": "email · phone · city · linkedin (only if present on resume)",
  "summary": "3-4 sentences; open with the verified full-time years above when known, then weave true JD-aligned keywords",
  "skills": string[] (comma-list keywords; only skills evidenced on resume),
  "experience": [{ "company", "title", "dates", "bullets": string[3-5] }],
  "education": [{ "school", "degree", "dates", "details"? }],
  "projects": [{ "name", "dates"?, "bullets": string[] }] (only if on resume; else []),
  "estimatedAtsScore": number 0-100 (honest estimate after rewrite vs this JD),
  "additions": string[4-8] (
    Concrete "what we added / emphasized for this JD" items a user can verify on the new resume.
    Examples:
    - "Summary now leads with backend API work matching the JD"
    - "Moved TypeScript, Node.js, PostgreSQL into Skills (were only buried in bullets)"
    - "Rewrote Acme bullets to use 'microservices' wording already true in your history"
    Each item must name the section or role affected and the JD keyword/theme.
  ),
  "stillMissing": string[0-6] (
    JD requirements NOT on the resume that we did not invent — be honest.
  ),
  "changesSummary": string[3-6] (short structural edits),
  "atsTips": string[2-4] (why ATS parsers like this layout)
}

Keep experience/education/projects truthful. Prefer strong action verbs and measurable outcomes only when present in the resume.`,
  });

  const sections = normalizeSections(result);
  const latex = fillAtsLatexTemplate(sections);
  const markdown = sectionsToMarkdown(sections);

  const additions = asStringArray(result.additions, 8);
  const stillMissing = asStringArray(result.stillMissing, 6);
  const changesSummary = asStringArray(result.changesSummary, 6);

  return {
    sections,
    latex,
    markdown,
    estimatedAtsScore: Math.max(
      0,
      Math.min(100, Math.round(result.estimatedAtsScore ?? 0))
    ),
    additions:
      additions.length > 0
        ? additions
        : changesSummary.map((c) => c),
    stillMissing,
    changesSummary,
    atsTips: asStringArray(result.atsTips, 4),
  };
}
