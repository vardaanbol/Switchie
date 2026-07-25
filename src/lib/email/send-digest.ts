import { Resend } from "resend";
import DailyDigestEmail, { type DigestJob } from "@/emails/daily-digest";

export async function sendDailyDigest(opts: {
  to: string;
  name: string;
  jobs: DigestJob[];
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const dashboardUrl =
    process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";

  const from =
    process.env.RESEND_FROM_EMAIL ?? "Job Finder Agent <onboarding@resend.dev>";

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
    throw new Error(error.message);
  }

  return data;
}
