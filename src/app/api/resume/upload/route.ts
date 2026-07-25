import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { extractResumeSkills } from "@/lib/agent/extract-resume-skills";
import {
  extractResumeExperience,
  type ResumeExperience,
} from "@/lib/agent/extract-resume-experience";
import {
  capResumeText,
  extractResumeTextFromBuffer,
} from "@/lib/resume/extract-text";
import { resumeFingerprint } from "@/lib/resume/fingerprint";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

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
    text = capResumeText(
      await extractResumeTextFromBuffer(buffer, {
        fileName: file.name,
        mimeType: file.type,
      })
    );
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
  let experience: ResumeExperience | null = null;
  if (text.trim().length > 40) {
    const [skillsResult, experienceResult] = await Promise.allSettled([
      extractResumeSkills(text),
      extractResumeExperience(text),
    ]);

    if (skillsResult.status === "fulfilled") skills = skillsResult.value;
    else console.warn("[resume] skill extraction failed", skillsResult.reason);

    if (experienceResult.status === "fulfilled")
      experience = experienceResult.value;
    else
      console.warn(
        "[resume] experience extraction failed",
        experienceResult.reason
      );
  }

  user.set("profile.resumeUrl", blob.url);
  user.set("profile.resumeText", text || undefined);
  user.set(
    "profile.resumeFingerprint",
    text ? resumeFingerprint(text) : undefined
  );
  user.set("profile.resumeParsedSkills", skills);
  user.set("profile.preferredLocations", user.profile?.preferredLocations ?? []);
  user.set("profile.rolesOfInterest", user.profile?.rolesOfInterest ?? []);
  user.set(
    "profile.emailDigestEnabled",
    user.profile?.emailDigestEnabled ?? true
  );

  if (experience) {
    user.set("profile.resumeExperienceMonths", experience.fullTimeMonths);
    user.set("profile.resumeExperienceYears", experience.fullTimeYears);
    user.set("profile.resumeInternshipMonths", experience.internshipMonths);
    user.set("profile.resumeExperienceRoles", experience.roles);
    user.set("profile.resumeExperienceAt", new Date());
  }

  user.set("profile.updatedAt", new Date());
  await user.save();

  return NextResponse.json({
    resumeUrl: blob.url,
    resumeParsedSkills: skills,
    resumeExperienceYears: experience?.fullTimeYears ?? null,
  });
}
