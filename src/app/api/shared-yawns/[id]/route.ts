import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import JobListing from "@/models/JobListing";
import SharedYawn from "@/models/SharedYawn";
import { mapSharedYawn } from "@/lib/jobs/shared-yawn";

const bodySchema = z.object({
  status: z.enum(["saved", "dismissed"]),
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
  const nextStatus = parsed.data.status;

  const share = await SharedYawn.findOneAndUpdate(
    { _id: id, toUserId: user._id },
    { $set: { status: nextStatus } },
    { new: true }
  ).lean();

  if (!share) {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }

  // Saving a share copies it onto the recipient's own board so it shows in Saved.
  if (nextStatus === "saved") {
    await JobListing.updateOne(
      { userId: user._id, sourceUrl: share.sourceUrl },
      {
        $setOnInsert: {
          userId: user._id,
          title: share.title,
          company: share.company,
          description: share.description ?? "",
          sourceUrl: share.sourceUrl,
          location: share.location ?? "",
          workMode: share.workMode ?? undefined,
          salaryEstimateMin: share.salaryEstimateMin ?? undefined,
          salaryEstimateMax: share.salaryEstimateMax ?? undefined,
          salaryIsEstimate: share.salaryIsEstimate ?? true,
          matchScore: share.matchScore ?? 0,
          pros: share.pros ?? [],
          cons: share.cons ?? [],
          referralContacts: share.referralContacts ?? [],
          requiredExperienceYears: share.requiredExperienceYears ?? undefined,
          foundAt: new Date(),
          status: "saved",
          savedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  return NextResponse.json({ share: mapSharedYawn(share) });
}
