import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { requireUser } from "@/lib/auth-helpers";
import { extractResumeSkills } from "@/lib/agent/extract-resume-skills";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

async function extractText(file: File, buffer: Buffer): Promise<string> {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const parsed = await parser.getText();
      return parsed.text ?? "";
    } finally {
      await parser.destroy();
    }
  }

  if (
    file.type.includes("word") ||
    name.endsWith(".docx") ||
    name.endsWith(".doc")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? "";
  }

  throw new Error("Unsupported file type. Upload PDF or DOCX.");
}

export async function POST(req: Request) {
  const authResult = await requireUser();
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN is not configured" },
      { status: 500 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be ≤ 5MB" }, { status: 400 });
  }
  if (
    file.type &&
    !ALLOWED.has(file.type) &&
    !file.name.match(/\.(pdf|docx?)$/i)
  ) {
    return NextResponse.json({ error: "Only PDF/DOCX allowed" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let text = "";
  try {
    text = await extractText(file, buffer);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to parse resume" },
      { status: 400 }
    );
  }

  const blob = await put(`resumes/${user._id}-${Date.now()}-${file.name}`, buffer, {
    access: "public",
    contentType: file.type || "application/octet-stream",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  let skills: string[] = [];
  if (text.trim().length > 40) {
    try {
      skills = await extractResumeSkills(text);
    } catch (err) {
      console.warn("[resume] skill extraction failed", err);
    }
  }

  user.profile = {
    ...user.profile,
    resumeUrl: blob.url,
    resumeParsedSkills: skills,
    preferredLocations: user.profile?.preferredLocations ?? [],
    rolesOfInterest: user.profile?.rolesOfInterest ?? [],
    emailDigestEnabled: user.profile?.emailDigestEnabled ?? true,
    updatedAt: new Date(),
  };
  await user.save();

  return NextResponse.json({
    resumeUrl: blob.url,
    resumeParsedSkills: skills,
  });
}
