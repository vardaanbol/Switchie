"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, RefreshCw, Settings } from "lucide-react";
import type { JobStatus, WorkMode } from "@/models";

export type DashboardJob = {
  _id: string;
  title: string;
  company: string;
  description: string;
  sourceUrl: string;
  location?: string;
  workMode?: WorkMode;
  salaryEstimateMin?: number;
  salaryEstimateMax?: number;
  salaryIsEstimate?: boolean;
  pros: string[];
  cons: string[];
  referralContacts: Array<{
    name: string;
    title: string;
    company: string;
    profileUrl: string;
    confidence?: number;
  }>;
  matchScore: number;
  status: JobStatus;
  foundAt: string;
};

function formatInr(n?: number) {
  if (typeof n !== "number") return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function DashboardClient({
  initialJobs,
  userName,
}: {
  initialJobs: DashboardJob[];
  userName: string;
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [status, setStatus] = useState<string>("all");
  const [workMode, setWorkMode] = useState<string>("all");
  const [location, setLocation] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [refreshing, startRefresh] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      if (status !== "all" && job.status !== status) return false;
      if (workMode !== "all" && job.workMode !== workMode) return false;
      if (
        location &&
        !(job.location ?? "").toLowerCase().includes(location.toLowerCase())
      ) {
        return false;
      }
      if (salaryMin && (job.salaryEstimateMax ?? 0) < Number(salaryMin)) {
        return false;
      }
      if (salaryMax && (job.salaryEstimateMin ?? 0) > Number(salaryMax)) {
        return false;
      }
      return true;
    });
  }, [jobs, status, workMode, location, salaryMin, salaryMax]);

  async function updateStatus(id: string, next: JobStatus) {
    setPendingId(id);
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setJobs((prev) =>
        prev.map((j) => (j._id === id ? { ...j, status: next } : j))
      );
      toast.success(`Marked as ${next}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setPendingId(null);
    }
  }

  function refreshNow() {
    startRefresh(async () => {
      try {
        const res = await fetch("/api/jobs/refresh", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Refresh failed");
        toast.success(
          `Found ${data.summary?.fetched ?? 0}, saved ${data.summary?.saved ?? 0}`
        );
        const listRes = await fetch("/api/jobs");
        const listData = await listRes.json();
        if (listRes.ok) setJobs(listData.jobs);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Refresh failed");
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            Hi {userName.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground">
            Jobs ranked by match score. Salaries shown in ₹.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/settings" />}
          >
            <Settings className="size-4" />
            Settings
          </Button>
          <Button onClick={refreshNow} disabled={refreshing}>
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Searching…" : "Refresh now"}
          </Button>
        </div>
      </header>

      <section className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="saved">Saved</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
              <SelectItem value="viewed">Viewed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Work mode</Label>
          <Select value={workMode} onValueChange={(v) => setWorkMode(v ?? "all")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="onsite">Onsite</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Location</Label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City"
          />
        </div>
        <div className="space-y-2">
          <Label>Salary min ₹</Label>
          <Input
            type="number"
            value={salaryMin}
            onChange={(e) => setSalaryMin(e.target.value)}
            placeholder="e.g. 1000000"
          />
        </div>
        <div className="space-y-2">
          <Label>Salary max ₹</Label>
          <Input
            type="number"
            value={salaryMax}
            onChange={(e) => setSalaryMax(e.target.value)}
            placeholder="e.g. 3000000"
          />
        </div>
      </section>

      {filtered.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No jobs yet</CardTitle>
            <CardDescription>
              Hit Refresh now to run the discovery agent, or wait for the daily
              digest.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((job) => {
            const min = formatInr(job.salaryEstimateMin);
            const max = formatInr(job.salaryEstimateMax);
            const salary =
              min && max
                ? `${min} – ${max}${job.salaryIsEstimate ? " (est.)" : ""}`
                : "Salary n/a";
            const open = expanded[job._id];

            return (
              <Card key={job._id}>
                <CardHeader className="gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{job.title}</CardTitle>
                      <CardDescription>
                        {job.company}
                        {job.location ? ` · ${job.location}` : ""}
                        {job.workMode ? ` · ${job.workMode}` : ""}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{job.matchScore}% match</Badge>
                      <Badge variant="secondary">{job.status}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{salary}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm leading-relaxed">{job.description}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setExpanded((e) => ({ ...e, [job._id]: !open }))
                    }
                  >
                    {open ? "Hide pros/cons" : "Show pros/cons & referrals"}
                  </Button>
                  {open && (
                    <div className="space-y-3 rounded-lg bg-muted/40 p-3 text-sm">
                      <div>
                        <p className="font-medium">Pros</p>
                        <ul className="list-disc pl-5 text-muted-foreground">
                          {job.pros.map((p) => (
                            <li key={p}>{p}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium">Cons</p>
                        <ul className="list-disc pl-5 text-muted-foreground">
                          {job.cons.map((c) => (
                            <li key={c}>{c}</li>
                          ))}
                        </ul>
                      </div>
                      {job.referralContacts?.length > 0 && (
                        <div>
                          <p className="font-medium">Referral contacts</p>
                          <ul className="space-y-1">
                            {job.referralContacts.map((c) => (
                              <li key={c.profileUrl}>
                                <a
                                  href={c.profileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline"
                                >
                                  {c.name} — {c.title}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
                <Separator />
                <CardFooter className="flex flex-wrap gap-2 pt-4">
                  <Button
                    variant="outline"
                    render={
                      <a
                        href={job.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                  >
                    <ExternalLink className="size-4" />
                    View listing
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={pendingId === job._id}
                    onClick={() => updateStatus(job._id, "saved")}
                  >
                    Save
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={pendingId === job._id}
                    onClick={() => updateStatus(job._id, "applied")}
                  >
                    Mark applied
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={pendingId === job._id}
                    onClick={() => updateStatus(job._id, "dismissed")}
                  >
                    Dismiss
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
