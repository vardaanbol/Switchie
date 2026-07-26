import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import SharedYawn from "@/models/SharedYawn";
import { mapSharedYawn } from "@/lib/jobs/shared-yawn";

export async function GET(req: Request) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user } = result;

  const includeDismissed =
    new URL(req.url).searchParams.get("includeDismissed") === "1";

  const query: Record<string, unknown> = { toUserId: user._id };
  if (!includeDismissed) {
    query.status = { $ne: "dismissed" };
  }

  const shares = await SharedYawn.find(query).sort({ createdAt: -1 }).lean();

  return NextResponse.json({ shares: shares.map(mapSharedYawn) });
}
