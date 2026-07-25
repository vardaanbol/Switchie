import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongodb";
import JobListing from "@/models/JobListing";
import { redirect, notFound } from "next/navigation";
import {
  dayKey,
  isValidDayParam,
  mapDashboardJob,
} from "@/lib/jobs/dashboard-job";
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
  const jobs = await JobListing.find({ userId: session.user.id })
    .sort({ matchScore: -1, foundAt: -1 })
    .lean();

  const dayJobs = jobs
    .map(mapDashboardJob)
    .filter((job) => dayKey(job.foundAt) === date);

  return (
    <DayClient
      date={date}
      initialJobs={dayJobs}
      userName={session.user.name ?? "there"}
    />
  );
}
