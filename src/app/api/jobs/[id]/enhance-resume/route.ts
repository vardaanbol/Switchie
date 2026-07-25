import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import JobListing from "@/models/JobListing";
import { getUserResumeProfile } from "@/lib/resume/get-user-resume-profile";
import { enhanceResumeForJob } from "@/lib/agent/enhance-resume";
import { isGeminiOverloadedError } from "@/lib/agent/gemini";

export const maxDuration = 120;

function payloadFromJob(job: {
  enhancedResumeTex?: string | null;
  enhancedResumeMarkdown?: string | null;
  enhancedResumeAtsTips?: string[] | null;
  enhancedResumeAdditions?: string[] | null;
  enhancedResumeStillMissing?: string[] | null;
  enhancedResumeAt?: Date | null;
  cached: boolean;
  estimatedAtsScore?: number;
}) {
  return {
    enhancedResumeTex: job.enhancedResumeTex,
    enhancedResumeMarkdown: job.enhancedResumeMarkdown,
    enhancedResumeAtsTips: job.enhancedResumeAtsTips ?? [],
    enhancedResumeAdditions: job.enhancedResumeAdditions ?? [],
    enhancedResumeStillMissing: job.enhancedResumeStillMissing ?? [],
    enhancedResumeAt: job.enhancedResumeAt,
    estimatedAtsScore: job.estimatedAtsScore,
    cached: job.cached,
  };
}

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

  // The generated .tex lives in Mongo; only regenerate on demand or after a
  // new resume upload (fingerprint change).
  const storedFingerprint = user.profile?.resumeFingerprint;
  const fileIsFresh =
    Boolean(job.enhancedResumeTex) &&
    Boolean(job.enhancedResumeMarkdown) &&
    Boolean(job.enhancedResumeAt) &&
    (!job.enhancedResumeFingerprint ||
      !storedFingerprint ||
      job.enhancedResumeFingerprint === storedFingerprint);

  if (!force && fileIsFresh) {
    return NextResponse.json(
      payloadFromJob({
        enhancedResumeTex: job.enhancedResumeTex,
        enhancedResumeMarkdown: job.enhancedResumeMarkdown,
        enhancedResumeAtsTips: job.enhancedResumeAtsTips,
        enhancedResumeAdditions: job.enhancedResumeAdditions,
        enhancedResumeStillMissing: job.enhancedResumeStillMissing,
        enhancedResumeAt: job.enhancedResumeAt,
        cached: true,
      })
    );
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
        error: "Upload a resume in Settings to generate an Enhanced Resume.",
        code: "NO_RESUME",
      },
      { status: 400 }
    );
  }

  try {
    const enhanced = await enhanceResumeForJob({
      resumeText: resume.text,
      jobTitle: job.title,
      company: job.company,
      description: job.description ?? "",
      gaps: job.resumeMatchGaps ?? [],
      experienceYears: resume.experienceYears,
      roles: resume.roles,
    });

    job.set("enhancedResumeTex", enhanced.latex);
    job.set("enhancedResumeMarkdown", enhanced.markdown);
    job.set("enhancedResumeAdditions", enhanced.additions);
    job.set("enhancedResumeStillMissing", enhanced.stillMissing);
    job.set("enhancedResumeAtsTips", [
      `Estimated ATS match after rewrite: ${enhanced.estimatedAtsScore}%`,
      ...enhanced.atsTips,
    ]);
    job.set("enhancedResumeFingerprint", resume.fingerprint);
    job.set("enhancedResumeAt", new Date());
    await job.save();

    return NextResponse.json({
      ...payloadFromJob({
        enhancedResumeTex: job.enhancedResumeTex,
        enhancedResumeMarkdown: job.enhancedResumeMarkdown,
        enhancedResumeAtsTips: job.enhancedResumeAtsTips,
        enhancedResumeAdditions: job.enhancedResumeAdditions,
        enhancedResumeStillMissing: job.enhancedResumeStillMissing,
        enhancedResumeAt: job.enhancedResumeAt,
        cached: false,
        estimatedAtsScore: enhanced.estimatedAtsScore,
      }),
      changesSummary: enhanced.changesSummary,
      atsTips: enhanced.atsTips,
    });
  } catch (err) {
    console.warn("[enhance-resume] failed", job._id, err);
    const busy = isGeminiOverloadedError(err);
    const message = busy
      ? "Gemini is temporarily overloaded. Please try again in a moment."
      : err instanceof Error
        ? err.message
        : "Enhanced resume generation failed";
    return NextResponse.json(
      {
        error: message,
        code: busy ? "MODEL_BUSY" : "ENHANCE_FAILED",
      },
      { status: busy ? 503 : 502 }
    );
  }
}
