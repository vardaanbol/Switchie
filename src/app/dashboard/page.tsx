import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongodb";
import JobListing from "@/models/JobListing";
import { redirect } from "next/navigation";
import {
  DashboardClient,
  type DashboardJob,
} from "./dashboard-client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  await connectDB();
  const jobs = await JobListing.find({ userId: session.user.id })
    .sort({ matchScore: -1, foundAt: -1 })
    .lean();

  const initialJobs: DashboardJob[] = jobs.map((job) => ({
    _id: job._id.toString(),
    title: job.title,
    company: job.company,
    description: job.description,
    sourceUrl: job.sourceUrl,
    location: job.location ?? undefined,
    workMode: job.workMode ?? undefined,
    salaryEstimateMin: job.salaryEstimateMin ?? undefined,
    salaryEstimateMax: job.salaryEstimateMax ?? undefined,
    salaryIsEstimate: job.salaryIsEstimate ?? true,
    pros: job.pros ?? [],
    cons: job.cons ?? [],
    referralContacts: (job.referralContacts ?? []).map((c) => ({
      name: c.name,
      title: c.title,
      company: c.company,
      profileUrl: c.profileUrl,
      confidence: c.confidence ?? undefined,
    })),
    matchScore: job.matchScore,
    status: job.status,
    foundAt: (job.foundAt ?? new Date()).toISOString(),
  }));

  return (
    <DashboardClient
      initialJobs={initialJobs}
      userName={session.user.name ?? "there"}
    />
  );
}
