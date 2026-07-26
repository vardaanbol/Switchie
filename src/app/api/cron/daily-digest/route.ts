import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import User from "@/models/User";
import JobListing from "@/models/JobListing";
import DigestLog from "@/models/DigestLog";
import {
  fillReferralsForJobs,
  runJobSearchAgent,
} from "@/lib/agent/run-job-search-agent";
import {
  getDigestFromAddress,
  isResendTestFrom,
  sendDailyDigest,
} from "@/lib/email/send-digest";
import { isProfileComplete } from "@/lib/profile";

export const maxDuration = 300;

/**
 * Email digests are still in B-phase. Set DIGEST_EMAILS_ENABLED=true to send.
 * Morning feed refresh always runs for every complete profile.
 */
function digestEmailsEnabled() {
  return process.env.DIGEST_EMAILS_ENABLED?.trim().toLowerCase() === "true";
}

function authorize(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

async function runMorningRefresh() {
  await connectDB();
  const emailsOn = digestEmailsEnabled();
  const from = getDigestFromAddress();

  if (emailsOn && isResendTestFrom(from)) {
    console.error(
      "[cron/daily-digest] RESEND_FROM_EMAIL still uses @resend.dev — digests will fail for every inbox except the Resend account owner. Verify a domain and update the env var."
    );
  }

  // Feed refresh is for everyone with a finished profile — not gated on email.
  const users = await User.find({});

  const results: Array<{
    userId: string;
    email?: string;
    feedStatus: string;
    emailStatus: string;
    jobs: number;
    saved?: number;
    error?: string;
  }> = [];

  for (const user of users) {
    if (!isProfileComplete(user.profile)) {
      results.push({
        userId: user._id.toString(),
        email: user.email,
        feedStatus: "skipped",
        emailStatus: "skipped",
        jobs: 0,
        error: "incomplete profile",
      });
      continue;
    }

    try {
      const summary = await runJobSearchAgent(user._id.toString());
      await fillReferralsForJobs(summary.referralJobIds);

      const feedResult = {
        userId: user._id.toString(),
        email: user.email,
        feedStatus: "refreshed",
        emailStatus: "skipped",
        jobs: summary.fetched,
        saved: summary.saved,
      };

      const wantsEmail = Boolean(user.profile?.emailDigestEnabled);
      if (!emailsOn) {
        results.push({
          ...feedResult,
          emailStatus: "disabled_b_phase",
        });
        continue;
      }
      if (!wantsEmail) {
        results.push({
          ...feedResult,
          emailStatus: "opted_out",
        });
        continue;
      }

      const jobs = await JobListing.find({
        userId: user._id,
        status: { $in: ["new", "viewed"] },
        foundAt: {
          // Today's IST morning batch — roughly last 12h covers the cron window.
          $gte: new Date(Date.now() - 12 * 60 * 60 * 1000),
        },
      })
        .sort({ matchScore: -1 })
        .limit(8)
        .lean();

      if (jobs.length === 0) {
        await DigestLog.create({
          userId: user._id,
          sentAt: new Date(),
          jobIds: [],
          emailStatus: "skipped",
          errorMessage: "no new jobs",
        });
        results.push({
          ...feedResult,
          emailStatus: "skipped",
          error: "no new jobs for email",
        });
        continue;
      }

      await sendDailyDigest({
        to: user.email,
        name: user.name,
        jobs: jobs.map((j) => ({
          title: j.title,
          company: j.company,
          description: j.description,
          location: j.location ?? undefined,
          salaryEstimateMin: j.salaryEstimateMin ?? undefined,
          salaryEstimateMax: j.salaryEstimateMax ?? undefined,
          salaryIsEstimate: j.salaryIsEstimate ?? true,
          pros: j.pros ?? [],
          cons: j.cons ?? [],
          sourceUrl: j.sourceUrl,
          matchScore: j.matchScore,
          referralContacts: (j.referralContacts ?? []).map((c) => ({
            name: c.name,
            title: c.title,
            profileUrl: c.profileUrl,
          })),
        })),
      });

      await DigestLog.create({
        userId: user._id,
        sentAt: new Date(),
        jobIds: jobs.map((j) => j._id),
        emailStatus: "sent",
      });

      results.push({
        ...feedResult,
        emailStatus: "sent",
        jobs: jobs.length,
      });

      // Soft pacing for Resend free tier
      await new Promise((r) => setTimeout(r, 400));
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      console.error(
        `[cron/daily-digest] failed for ${user.email}:`,
        message
      );
      await DigestLog.create({
        userId: user._id,
        sentAt: new Date(),
        jobIds: [],
        emailStatus: "failed",
        errorMessage: message,
      });
      results.push({
        userId: user._id.toString(),
        email: user.email,
        feedStatus: "failed",
        emailStatus: "failed",
        jobs: 0,
        error: message,
      });
    }
  }

  return {
    from,
    usingTestFrom: isResendTestFrom(from),
    digestEmailsEnabled: emailsOn,
    results,
  };
}

export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = await runMorningRefresh();
  return NextResponse.json({ ok: true, ...payload });
}

export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = await runMorningRefresh();
  return NextResponse.json({ ok: true, ...payload });
}
