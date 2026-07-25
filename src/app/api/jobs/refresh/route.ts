import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { runJobSearchAgent } from "@/lib/agent/run-job-search-agent";
import {
  assertRefreshAllowed,
  markRefresh,
} from "@/models/RefreshRateLimit";

export const maxDuration = 300;

export async function POST() {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user } = result;

  const gate = await assertRefreshAllowed(user._id);
  if (!gate.allowed) {
    return NextResponse.json(
      {
        error: "Rate limited. You can refresh once per hour.",
        retryAfterSeconds: gate.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(gate.retryAfterSeconds) },
      }
    );
  }

  try {
    await markRefresh(user._id);
    const summary = await runJobSearchAgent(user._id.toString());
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Agent failed" },
      { status: 500 }
    );
  }
}
