import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import JobListing from "@/models/JobListing";
import SharedYawn from "@/models/SharedYawn";
import User from "@/models/User";

const bodySchema = z.object({
  toUserId: z.string().min(1),
  comment: z.string().trim().max(500).optional(),
});

function isDuplicateKeyError(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: number }).code === 11000
  );
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user } = result;
  const { id } = await context.params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { toUserId, comment } = parsed.data;

  if (!mongoose.isValidObjectId(toUserId)) {
    return NextResponse.json({ error: "Invalid recipient" }, { status: 400 });
  }
  if (toUserId === user._id.toString()) {
    return NextResponse.json(
      { error: "You can’t share a job with yourself" },
      { status: 400 }
    );
  }

  const [job, recipient] = await Promise.all([
    JobListing.findOne({ _id: id, userId: user._id }).lean(),
    User.findById(toUserId).select("_id").lean(),
  ]);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (!recipient) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }

  try {
    await SharedYawn.create({
      fromUserId: user._id,
      toUserId: recipient._id,
      fromJobId: job._id,
      fromUserName: user.name,
      fromUserEmail: user.email,
      comment: comment || undefined,
      title: job.title,
      company: job.company,
      description: job.description ?? "",
      sourceUrl: job.sourceUrl,
      location: job.location ?? "",
      workMode: job.workMode ?? undefined,
      salaryEstimateMin: job.salaryEstimateMin ?? undefined,
      salaryEstimateMax: job.salaryEstimateMax ?? undefined,
      salaryIsEstimate: job.salaryIsEstimate ?? true,
      pros: job.pros ?? [],
      cons: job.cons ?? [],
      referralContacts: job.referralContacts ?? [],
      requiredExperienceYears: job.requiredExperienceYears ?? undefined,
      matchScore: job.matchScore ?? 0,
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return NextResponse.json(
        { error: "You already shared this job with them" },
        { status: 409 }
      );
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
