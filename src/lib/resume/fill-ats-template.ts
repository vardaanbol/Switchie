import { readFileSync } from "fs";
import path from "path";

export type AtsResumeSections = {
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
};

/** Escape LaTeX special characters in user/model content. */
export function escapeLatex(input: string): string {
  const map: Record<string, string> = {
    "\\": "\\textbackslash{}",
    "{": "\\{",
    "}": "\\}",
    $: "\\$",
    "&": "\\&",
    "#": "\\#",
    _: "\\_",
    "%": "\\%",
    "~": "\\textasciitilde{}",
    "^": "\\textasciicircum{}",
  };
  return input
    .replace(/[\\{}$&#_%~^]/g, (ch) => map[ch] ?? ch)
    .replace(/\n+/g, " ");
}

function itemize(bullets: string[]): string {
  const cleaned = bullets.map((b) => b.trim()).filter(Boolean);
  if (cleaned.length === 0) return "";
  const items = cleaned
    .map((b) => `  \\item ${escapeLatex(b)}`)
    .join("\n");
  return `\\begin{itemize}\n${items}\n\\end{itemize}`;
}

function loadTemplate(): string {
  const filePath = path.join(
    process.cwd(),
    "src/lib/resume/templates/ats-resume.tex"
  );
  return readFileSync(filePath, "utf8");
}

export function fillAtsLatexTemplate(sections: AtsResumeSections): string {
  const template = loadTemplate();

  const skillsLine =
    sections.skills.length > 0
      ? escapeLatex(sections.skills.join(", "))
      : escapeLatex("See experience");

  const experienceBlock = sections.experience
    .map((job) => {
      const header = `\\textbf{${escapeLatex(job.title)}} --- ${escapeLatex(job.company)} \\hfill ${escapeLatex(job.dates)}`;
      const bullets = itemize(job.bullets);
      return `${header}\n${bullets}`;
    })
    .filter(Boolean)
    .join("\n\n");

  const educationBlock = sections.education
    .map((ed) => {
      const header = `\\textbf{${escapeLatex(ed.degree)}} --- ${escapeLatex(ed.school)} \\hfill ${escapeLatex(ed.dates)}`;
      const detail = ed.details?.trim()
        ? `\\\\\n${escapeLatex(ed.details.trim())}`
        : "";
      return `${header}${detail}`;
    })
    .filter(Boolean)
    .join("\n\n");

  const projectsBlock = sections.projects
    .map((p) => {
      const dates = p.dates?.trim() ? ` \\hfill ${escapeLatex(p.dates)}` : "";
      const header = `\\textbf{${escapeLatex(p.name)}}${dates}`;
      const bullets = itemize(p.bullets);
      return `${header}\n${bullets}`;
    })
    .filter(Boolean)
    .join("\n\n");

  return template
    .replace(/%%NAME%%/g, escapeLatex(sections.name || "Candidate"))
    .replace(/%%CONTACT%%/g, escapeLatex(sections.contact || ""))
    .replace(/%%SUMMARY%%/g, escapeLatex(sections.summary || ""))
    .replace(/%%SKILLS%%/g, skillsLine)
    .replace(
      /%%EXPERIENCE%%/g,
      experienceBlock || escapeLatex("Experience details available on request.")
    )
    .replace(
      /%%EDUCATION%%/g,
      educationBlock || escapeLatex("Education details available on request.")
    )
    .replace(
      /%%PROJECTS%%/g,
      projectsBlock || escapeLatex("Project details available on request.")
    );
}

export function sectionsToMarkdown(sections: AtsResumeSections): string {
  const lines: string[] = [];
  lines.push(`# ${sections.name}`);
  if (sections.contact) lines.push(sections.contact, "");
  lines.push("## Summary", sections.summary, "");
  lines.push("## Skills", sections.skills.join(", "), "");
  lines.push("## Experience");
  for (const job of sections.experience) {
    lines.push(`### ${job.title} — ${job.company}`, `*${job.dates}*`);
    for (const b of job.bullets) lines.push(`- ${b}`);
    lines.push("");
  }
  lines.push("## Education");
  for (const ed of sections.education) {
    lines.push(`### ${ed.degree} — ${ed.school}`, `*${ed.dates}*`);
    if (ed.details) lines.push(ed.details);
    lines.push("");
  }
  if (sections.projects.length > 0) {
    lines.push("## Projects");
    for (const p of sections.projects) {
      lines.push(`### ${p.name}${p.dates ? ` (${p.dates})` : ""}`);
      for (const b of p.bullets) lines.push(`- ${b}`);
      lines.push("");
    }
  }
  return lines.join("\n").trim() + "\n";
}
