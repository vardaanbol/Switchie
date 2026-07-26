import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import JobListing from "@/models/JobListing";
import {
  buildAtsResumePdf,
  markdownToAtsSections,
} from "@/lib/resume/build-ats-pdf";
import type { AtsResumeSections } from "@/lib/resume/fill-ats-template";

export const maxDuration = 60;

function isAtsSections(value: unknown): value is AtsResumeSections {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<AtsResumeSections>;
  return typeof v.name === "string" && Array.isArray(v.experience);
}

function safeFilename(company: string, title: string) {
  return `${company}-${title}`
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user } = result;
  const { id } = await context.params;

  const job = await JobListing.findOne({ _id: id, userId: user._id }).lean();
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (!job.enhancedResumeMarkdown && !job.enhancedResumeSections) {
    return NextResponse.json(
      {
        error: "Generate an enhanced resume first, then download the PDF.",
        code: "NO_ENHANCED_RESUME",
      },
      { status: 400 }
    );
  }

  const sections =
    (isAtsSections(job.enhancedResumeSections)
      ? job.enhancedResumeSections
      : null) ??
    (job.enhancedResumeMarkdown
      ? markdownToAtsSections(job.enhancedResumeMarkdown)
      : null);

  if (!sections) {
    return NextResponse.json(
      {
        error:
          "Could not build PDF from this resume. Hit Regenerate, then try again.",
        code: "PDF_PARSE_FAILED",
      },
      { status: 422 }
    );
  }

  try {
    const pdfBytes = await buildAtsResumePdf(sections);
    const filename = `${safeFilename(job.company, job.title)}-ats-resume.pdf`;
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.warn("[enhanced-resume-pdf] failed", id, err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to generate resume PDF",
        code: "PDF_FAILED",
      },
      { status: 500 }
    );
  }
}
