import { Resend } from "resend";
import DailyDigestEmail, { type DigestJob } from "@/emails/daily-digest";

/** Resend's shared test sender can only deliver to the account owner's inbox. */
export function isResendTestFrom(from: string): boolean {
  return /@resend\.dev\s*>?$/i.test(from.trim());
}

export function getDigestFromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Job Finder Agent <onboarding@resend.dev>"
  );
}

function clarifyResendError(message: string, from: string): string {
  if (
    /only send testing emails to your own email/i.test(message) ||
    isResendTestFrom(from)
  ) {
    return (
      `${message} ` +
      `Fix: verify a domain at https://resend.com/domains and set RESEND_FROM_EMAIL ` +
      `to an address on that domain (currently: ${from}).`
    );
  }
  return message;
}

export async function sendDailyDigest(opts: {
  to: string;
  name: string;
  jobs: DigestJob[];
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const from = getDigestFromAddress();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const dashboardUrl =
    process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";

  const { data, error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: `Your daily job digest — ${opts.jobs.length} matches`,
    react: DailyDigestEmail({
      name: opts.name,
      jobs: opts.jobs,
      dashboardUrl: `${dashboardUrl}/dashboard`,
    }),
  });

  if (error) {
    throw new Error(clarifyResendError(error.message, from));
  }

  return data;
}
