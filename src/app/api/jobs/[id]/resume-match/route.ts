import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import JobListing from "@/models/JobListing";
import { getUserResumeProfile } from "@/lib/resume/get-user-resume-profile";
import { scoreResumeMatch } from "@/lib/agent/score-resume-match";
import { isGeminiOverloadedError } from "@/lib/agent/gemini";

export const maxDuration = 60;

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user } = result;
  const { id } = await context.params;

  const job = await JobListing.findOne({ _id: id, userId: user._id });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  let force = false;
  try {
    const body = (await req.json()) as { force?: boolean };
    force = Boolean(body?.force);
  } catch {
    /* no body */
  }

  // Reuse the stored score unless the resume changed — no model call at all.
  const storedFingerprint = user.profile?.resumeFingerprint;
  const scoreIsFresh =
    typeof job.resumeMatchScore === "number" &&
    (!job.resumeMatchFingerprint ||
      !storedFingerprint ||
      job.resumeMatchFingerprint === storedFingerprint);

  if (!force && scoreIsFresh) {
    return NextResponse.json({
      resumeMatchScore: job.resumeMatchScore,
      resumeMatchGaps: job.resumeMatchGaps ?? [],
      strengths: job.resumeMatchStrengths ?? [],
      keywordHits: job.resumeMatchKeywordHits ?? [],
      resumeMatchExperienceYears: job.resumeMatchExperienceYears ?? null,
      resumeMatchRequiredYears: job.resumeMatchRequiredYears ?? null,
      resumeMatchExperienceVerdict: job.resumeMatchExperienceVerdict ?? null,
      resumeMatchAt: job.resumeMatchAt ?? null,
      cached: true,
    });
  }

  let resume: Awaited<ReturnType<typeof getUserResumeProfile>>;
  try {
    resume = await getUserResumeProfile(user);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to read resume text",
        code: "RESUME_READ_FAILED",
      },
      { status: 400 }
    );
  }

  if (!resume) {
    return NextResponse.json(
      {
        error: "Upload a resume in Settings to score Resume Match.",
        code: "NO_RESUME",
      },
      { status: 400 }
    );
  }

  try {
    const scored = await scoreResumeMatch({
      resumeText: resume.text,
      jobTitle: job.title,
      company: job.company,
      description: job.description ?? "",
      experienceYears: resume.experienceYears,
      roles: resume.roles,
    });

    const scoredAt = new Date();
    job.set("resumeMatchScore", scored.score);
    job.set("resumeMatchGaps", scored.gaps);
    job.set("resumeMatchStrengths", scored.strengths);
    job.set("resumeMatchKeywordHits", scored.keywordHits);
    job.set("resumeMatchExperienceYears", resume.experienceYears ?? undefined);
    job.set("resumeMatchRequiredYears", scored.requiredYears ?? undefined);
    job.set("resumeMatchExperienceVerdict", scored.experienceVerdict);
    job.set("resumeMatchFingerprint", resume.fingerprint);
    job.set("resumeMatchAt", scoredAt);
    await job.save();

    return NextResponse.json({
      resumeMatchScore: scored.score,
      resumeMatchGaps: scored.gaps,
      strengths: scored.strengths,
      keywordHits: scored.keywordHits,
      resumeMatchExperienceYears: resume.experienceYears,
      resumeMatchRequiredYears: scored.requiredYears,
      resumeMatchExperienceVerdict: scored.experienceVerdict,
      resumeMatchAt: scoredAt,
      cached: false,
    });
  } catch (err) {
    console.warn("[resume-match] scoring failed", job._id, err);
    const busy = isGeminiOverloadedError(err);
    const message = busy
      ? "Gemini is temporarily overloaded. Please try again in a moment."
      : err instanceof Error
        ? err.message
        : "Resume match scoring failed";
    return NextResponse.json(
      {
        error: message,
        code: busy ? "MODEL_BUSY" : "SCORE_FAILED",
      },
      { status: busy ? 503 : 502 }
    );
  }
}
