import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { AtsResumeSections } from "@/lib/resume/fill-ats-template";

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LINE_GAP = 2.5;

type Fonts = {
  regular: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
};

function wrapText(
  text: string,
  font: Fonts["regular"],
  size: number,
  maxWidth: number
): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    // Hard-break very long tokens
    if (font.widthOfTextAtSize(word, size) > maxWidth) {
      let chunk = "";
      for (const ch of word) {
        const trial = chunk + ch;
        if (font.widthOfTextAtSize(trial, size) <= maxWidth) {
          chunk = trial;
        } else {
          if (chunk) lines.push(chunk);
          chunk = ch;
        }
      }
      current = chunk;
    } else {
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Rebuild structured sections from our own markdown preview format. */
export function markdownToAtsSections(
  markdown: string
): AtsResumeSections | null {
  const text = markdown.trim();
  if (!text) return null;

  const lines = text.split(/\r?\n/);
  const nameLine = lines.find((l) => l.startsWith("# "));
  if (!nameLine) return null;

  const name = nameLine.replace(/^#\s+/, "").trim() || "Candidate";
  let i = lines.indexOf(nameLine) + 1;

  const contactParts: string[] = [];
  while (i < lines.length && !lines[i].startsWith("## ")) {
    const line = lines[i].trim();
    if (line) contactParts.push(line);
    i += 1;
  }

  const sections: Record<string, string[]> = {};
  let current: string | null = null;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      current = line.replace(/^##\s+/, "").trim().toLowerCase();
      sections[current] = [];
      continue;
    }
    if (current) sections[current].push(line);
  }

  const summary = (sections.summary ?? []).join("\n").trim();
  const skillsRaw = (sections.skills ?? []).join(" ").trim();
  const skills = skillsRaw
    ? skillsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  function parseJobs(block: string[]): AtsResumeSections["experience"] {
    const jobs: AtsResumeSections["experience"] = [];
    let cur: AtsResumeSections["experience"][number] | null = null;
    for (const line of block) {
      if (line.startsWith("### ")) {
        if (cur) jobs.push(cur);
        const heading = line.replace(/^###\s+/, "").trim();
        const [titlePart, companyPart] = heading.split(/\s+—\s+/);
        cur = {
          title: (titlePart ?? "").trim(),
          company: (companyPart ?? "").trim(),
          dates: "",
          bullets: [],
        };
        continue;
      }
      if (!cur) continue;
      const italic = line.match(/^\*(.+)\*$/);
      if (italic && !cur.dates) {
        cur.dates = italic[1].trim();
        continue;
      }
      if (line.startsWith("- ")) {
        cur.bullets.push(line.slice(2).trim());
      }
    }
    if (cur) jobs.push(cur);
    return jobs.filter((j) => j.title || j.company);
  }

  function parseEducation(block: string[]): AtsResumeSections["education"] {
    const eds: AtsResumeSections["education"] = [];
    let cur: AtsResumeSections["education"][number] | null = null;
    for (const line of block) {
      if (line.startsWith("### ")) {
        if (cur) eds.push(cur);
        const heading = line.replace(/^###\s+/, "").trim();
        const [degreePart, schoolPart] = heading.split(/\s+—\s+/);
        cur = {
          degree: (degreePart ?? "").trim(),
          school: (schoolPart ?? "").trim(),
          dates: "",
        };
        continue;
      }
      if (!cur) continue;
      const italic = line.match(/^\*(.+)\*$/);
      if (italic && !cur.dates) {
        cur.dates = italic[1].trim();
        continue;
      }
      if (line.trim() && !line.startsWith("- ")) {
        cur.details = line.trim();
      }
    }
    if (cur) eds.push(cur);
    return eds.filter((e) => e.school || e.degree);
  }

  function parseProjects(block: string[]): AtsResumeSections["projects"] {
    const projects: AtsResumeSections["projects"] = [];
    let cur: AtsResumeSections["projects"][number] | null = null;
    for (const line of block) {
      if (line.startsWith("### ")) {
        if (cur) projects.push(cur);
        const heading = line.replace(/^###\s+/, "").trim();
        const dateMatch = heading.match(/^(.*?)\s*\((.+)\)\s*$/);
        cur = {
          name: (dateMatch ? dateMatch[1] : heading).trim(),
          dates: dateMatch ? dateMatch[2].trim() : undefined,
          bullets: [],
        };
        continue;
      }
      if (!cur) continue;
      if (line.startsWith("- ")) cur.bullets.push(line.slice(2).trim());
    }
    if (cur) projects.push(cur);
    return projects.filter((p) => p.name);
  }

  return {
    name,
    contact: contactParts.join(" · "),
    summary,
    skills,
    experience: parseJobs(sections.experience ?? []),
    education: parseEducation(sections.education ?? []),
    projects: parseProjects(sections.projects ?? []),
  };
}

export async function buildAtsResumePdf(
  sections: AtsResumeSections
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const ensureSpace = (needed: number) => {
    if (y - needed >= MARGIN) return;
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  };

  const drawLines = (
    lines: string[],
    size: number,
    bold = false,
    color = rgb(0.08, 0.08, 0.08)
  ) => {
    const font = bold ? fonts.bold : fonts.regular;
    for (const line of lines) {
      ensureSpace(size + LINE_GAP);
      page.drawText(line, {
        x: MARGIN,
        y: y - size,
        size,
        font,
        color,
      });
      y -= size + LINE_GAP;
    }
  };

  const drawWrapped = (
    text: string,
    size: number,
    bold = false,
    color = rgb(0.08, 0.08, 0.08)
  ) => {
    const font = bold ? fonts.bold : fonts.regular;
    drawLines(wrapText(text, font, size, CONTENT_WIDTH), size, bold, color);
  };

  const drawSectionTitle = (title: string) => {
    ensureSpace(28);
    y -= 8;
    drawWrapped(title.toUpperCase(), 11, true);
    ensureSpace(6);
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 1,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 8;
  };

  // Header
  drawWrapped(sections.name || "Candidate", 18, true);
  y -= 2;
  if (sections.contact) {
    drawWrapped(sections.contact, 9, false, rgb(0.25, 0.25, 0.25));
  }
  y -= 4;

  if (sections.summary) {
    drawSectionTitle("Summary");
    drawWrapped(sections.summary, 10);
  }

  if (sections.skills.length > 0) {
    drawSectionTitle("Skills");
    drawWrapped(sections.skills.join(", "), 10);
  }

  if (sections.experience.length > 0) {
    drawSectionTitle("Experience");
    for (const job of sections.experience) {
      ensureSpace(36);
      const left = `${job.title}${job.company ? ` — ${job.company}` : ""}`;
      const right = job.dates || "";
      const leftSize = 10.5;
      const rightSize = 9;
      const rightWidth = right
        ? fonts.regular.widthOfTextAtSize(right, rightSize)
        : 0;
      const leftMax = CONTENT_WIDTH - rightWidth - (right ? 12 : 0);
      const leftLines = wrapText(left, fonts.bold, leftSize, leftMax);
      ensureSpace(leftLines.length * (leftSize + LINE_GAP) + 4);
      leftLines.forEach((line, idx) => {
        page.drawText(line, {
          x: MARGIN,
          y: y - leftSize,
          size: leftSize,
          font: fonts.bold,
          color: rgb(0.08, 0.08, 0.08),
        });
        if (idx === 0 && right) {
          page.drawText(right, {
            x: PAGE_WIDTH - MARGIN - rightWidth,
            y: y - leftSize,
            size: rightSize,
            font: fonts.regular,
            color: rgb(0.3, 0.3, 0.3),
          });
        }
        y -= leftSize + LINE_GAP;
      });
      for (const bullet of job.bullets) {
        const bulletLines = wrapText(
          `• ${bullet}`,
          fonts.regular,
          9.5,
          CONTENT_WIDTH - 8
        );
        for (const line of bulletLines) {
          ensureSpace(12);
          page.drawText(line, {
            x: MARGIN + 6,
            y: y - 9.5,
            size: 9.5,
            font: fonts.regular,
            color: rgb(0.12, 0.12, 0.12),
          });
          y -= 9.5 + LINE_GAP;
        }
      }
      y -= 6;
    }
  }

  if (sections.education.length > 0) {
    drawSectionTitle("Education");
    for (const ed of sections.education) {
      const left = `${ed.degree}${ed.school ? ` — ${ed.school}` : ""}`;
      const right = ed.dates || "";
      const rightWidth = right
        ? fonts.regular.widthOfTextAtSize(right, 9)
        : 0;
      const leftLines = wrapText(
        left,
        fonts.bold,
        10.5,
        CONTENT_WIDTH - rightWidth - (right ? 12 : 0)
      );
      ensureSpace(leftLines.length * 13 + 10);
      leftLines.forEach((line, idx) => {
        page.drawText(line, {
          x: MARGIN,
          y: y - 10.5,
          size: 10.5,
          font: fonts.bold,
          color: rgb(0.08, 0.08, 0.08),
        });
        if (idx === 0 && right) {
          page.drawText(right, {
            x: PAGE_WIDTH - MARGIN - rightWidth,
            y: y - 10.5,
            size: 9,
            font: fonts.regular,
            color: rgb(0.3, 0.3, 0.3),
          });
        }
        y -= 10.5 + LINE_GAP;
      });
      if (ed.details) drawWrapped(ed.details, 9.5, false, rgb(0.2, 0.2, 0.2));
      y -= 4;
    }
  }

  if (sections.projects.length > 0) {
    drawSectionTitle("Projects");
    for (const project of sections.projects) {
      const heading = project.dates
        ? `${project.name} (${project.dates})`
        : project.name;
      drawWrapped(heading, 10.5, true);
      for (const bullet of project.bullets) {
        const bulletLines = wrapText(
          `• ${bullet}`,
          fonts.regular,
          9.5,
          CONTENT_WIDTH - 8
        );
        for (const line of bulletLines) {
          ensureSpace(12);
          page.drawText(line, {
            x: MARGIN + 6,
            y: y - 9.5,
            size: 9.5,
            font: fonts.regular,
            color: rgb(0.12, 0.12, 0.12),
          });
          y -= 9.5 + LINE_GAP;
        }
      }
      y -= 6;
    }
  }

  return doc.save();
}
