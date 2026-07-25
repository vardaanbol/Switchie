import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import JobListing, { JOB_STATUSES, type JobStatus } from "@/models/JobListing";
import { z } from "zod";

const bodySchema = z.object({
  status: z.enum(JOB_STATUSES),
});

export async function PATCH(
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
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const job = await JobListing.findOneAndUpdate(
    { _id: id, userId: user._id },
    { $set: { status: parsed.data.status as JobStatus } },
    { new: true }
  ).lean();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    job: { ...job, _id: job._id.toString(), userId: job.userId.toString() },
  });
}
