import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongodb";
import JobListing from "@/models/JobListing";
import { redirect } from "next/navigation";
import { mapDashboardJob } from "@/lib/jobs/dashboard-job";
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
  const jobs = await JobListing.find({ userId: session.user.id })
    .sort({ matchScore: -1, foundAt: -1 })
    .lean();

  const initialJobs = jobs.map(mapDashboardJob);
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
    />
  );
}
