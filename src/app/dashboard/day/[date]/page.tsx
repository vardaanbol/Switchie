import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongodb";
import JobListing from "@/models/JobListing";
import User from "@/models/User";
import { redirect, notFound } from "next/navigation";
import {
  dayKey,
  isValidDayParam,
  mapDashboardJob,
} from "@/lib/jobs/dashboard-job";
import { filterJobsByExperience } from "@/lib/jobs/experience-filter";
import { DayClient } from "./day-client";

export default async function DayYawnsPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const { date } = await params;
  if (!isValidDayParam(date)) notFound();

  await connectDB();
  const [jobs, user] = await Promise.all([
    JobListing.find({ userId: session.user.id })
      .sort({ matchScore: -1, foundAt: -1 })
      .lean(),
    User.findById(session.user.id)
      .select("profile.resumeUrl profile.resumeExperienceYears")
      .lean(),
  ]);

  const candidateYears =
    typeof user?.profile?.resumeExperienceYears === "number"
      ? user.profile.resumeExperienceYears
      : null;

  const dayJobs = filterJobsByExperience(
    jobs.map(mapDashboardJob).filter((job) => dayKey(job.foundAt) === date),
    candidateYears,
    2
  );

  return (
    <DayClient
      date={date}
      initialJobs={dayJobs}
      userName={session.user.name ?? "there"}
      hasResume={Boolean(user?.profile?.resumeUrl)}
    />
  );
}
