import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongodb";
import JobListing from "@/models/JobListing";
import User from "@/models/User";
import { redirect } from "next/navigation";
import { mapDashboardJob } from "@/lib/jobs/dashboard-job";
import { filterJobsByExperience } from "@/lib/jobs/experience-filter";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const { view } = await searchParams;

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

  const initialJobs = filterJobsByExperience(
    jobs.map(mapDashboardJob),
    candidateYears,
    2
  );
  const hasResume = Boolean(user?.profile?.resumeUrl);
  const initialView =
    view === "calendar" ||
    view === "saved" ||
    view === "applied" ||
    view === "all"
      ? view
      : "all";

  return (
    <DashboardClient
      initialJobs={initialJobs}
      userName={session.user.name ?? "there"}
      initialView={initialView}
      hasResume={hasResume}
      resumeExperienceYears={candidateYears}
    />
  );
}
