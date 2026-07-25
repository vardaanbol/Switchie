import { NextResponse, after } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import {
  fillReferralsForJobs,
  runJobSearchAgent,
} from "@/lib/agent/run-job-search-agent";
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

    // Referral grounding is slow — fill it in after we return jobs to the UI
    const referralJobIds = summary.referralJobIds;
    if (referralJobIds.length > 0) {
      after(async () => {
        try {
          await fillReferralsForJobs(referralJobIds);
        } catch (err) {
          console.warn("[agent] background referrals failed", err);
        }
      });
    }

    return NextResponse.json({
      ok: true,
      summary: {
        fetched: summary.fetched,
        saved: summary.saved,
        skippedDuplicates: summary.skippedDuplicates,
        enriched: summary.enriched,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Agent failed" },
      { status: 500 }
    );
  }
}
