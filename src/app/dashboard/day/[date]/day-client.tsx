"use client";

import Link from "next/link";
import { ArrowLeft, LogOut, Settings } from "lucide-react";
import { signOut } from "next-auth/react";
import type { DashboardJob } from "@/lib/jobs/dashboard-job";
import { formatDayLabel } from "@/lib/jobs/dashboard-job";
import { JobsCarousel } from "@/components/jobs/jobs-carousel";
import {
  AppHeader,
  HeaderAction,
  HeaderLink,
} from "@/components/layout/app-header";
import { useState } from "react";

export function DayClient({
  date,
  initialJobs,
  userName,
  hasResume = false,
}: {
  date: string;
  initialJobs: DashboardJob[];
  userName: string;
  hasResume?: boolean;
}) {
  const firstName = userName.split(" ")[0] || "there";
  const label = formatDayLabel(date);
  const [jobs, setJobs] = useState(initialJobs);

  return (
    <div className="comic-paper relative min-h-dvh overflow-x-hidden text-black">
      <div className="comic-halftone pointer-events-none absolute inset-0 opacity-[0.35]" />

      <AppHeader
        actions={
          <>
            <HeaderLink href="/settings" aria-label="Settings">
              <Settings className="size-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </HeaderLink>
            <HeaderAction
              aria-label="Sign out"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Out</span>
            </HeaderAction>
          </>
        }
      />

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-6 px-3 py-7 sm:gap-8 sm:px-6 sm:py-9">
        <Link
          href="/dashboard?view=calendar"
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md border-[3px] border-black bg-white px-4 py-2.5 text-sm font-black shadow-[4px_4px_0_#000] transition-transform hover:-translate-y-0.5"
        >
          <ArrowLeft className="size-4" />
          Back to calendar
        </Link>

        <section className="relative overflow-hidden rounded-lg border-[3px] border-black bg-[#fffef8] p-4 shadow-[5px_5px_0_#000] sm:p-8 sm:shadow-[6px_6px_0_#000]">
          <div className="mb-3 sm:absolute sm:-right-3 sm:-top-3 sm:mb-0 sm:rotate-12">
            <div className="inline-block rounded-md border-[3px] border-black bg-[#ff6b6b] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-[2px_2px_0_#000]">
              {jobs.length} yawns
            </div>
          </div>
          <h1 className="break-words font-black tracking-tight text-3xl leading-[1.05] sm:pr-16 sm:text-5xl sm:leading-[0.95] md:text-6xl">
            Hey {firstName}
            <br />
            Checking Yawns of {label}
          </h1>
        </section>

        <JobsCarousel
          jobs={jobs}
          emptyMessage={`No yawns on ${label}. Pick another day from the calendar.`}
          hasResume={hasResume}
          onJobsPatch={(id, patch) => {
            setJobs((prev) =>
              prev.map((j) => (j._id === id ? { ...j, ...patch } : j))
            );
          }}
        />
      </main>
    </div>
  );
}
