import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import JobListing from "@/models/JobListing";
import { findReferralContacts } from "@/lib/agent/find-referral-contacts";

export const maxDuration = 180;

function isUsableReferralUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user } = result;
  const { id } = await context.params;
  const force = new URL(req.url).searchParams.get("force") === "1";

  const job = await JobListing.findOne({ _id: id, userId: user._id });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Reuse existing verified contacts (LinkedIn + other public web sources)
  const existing = (job.referralContacts ?? []).filter((c) =>
    isUsableReferralUrl(c.profileUrl)
  );
  if (!force && existing.length > 0) {
    return NextResponse.json({
      referralContacts: existing.map((c) => ({
        name: c.name,
        title: c.title,
        company: c.company,
        profileUrl: c.profileUrl,
        confidence: c.confidence ?? 0.5,
      })),
      cached: true,
    });
  }

  try {
    const contacts = await findReferralContacts({
      company: job.company,
      roleTitle: job.title,
    });

    job.set(
      "referralContacts",
      contacts.map((c) => ({
        name: c.name,
        title: c.title,
        company: c.company,
        profileUrl: c.profileUrl,
        confidence: c.confidence,
      }))
    );
    await job.save();

    return NextResponse.json({
      referralContacts: contacts,
      cached: false,
    });
  } catch (err) {
    console.warn("[referrals] lookup failed", job.company, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Referral search failed" },
      { status: 502 }
    );
  }
}
