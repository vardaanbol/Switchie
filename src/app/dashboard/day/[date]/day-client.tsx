"use client";

import Link from "next/link";
import { ArrowLeft, LogOut, Settings } from "lucide-react";
import { signOut } from "next-auth/react";
import type { DashboardJob } from "@/lib/jobs/dashboard-job";
import { formatDayLabel } from "@/lib/jobs/dashboard-job";
import { JobsCarousel } from "@/components/jobs/jobs-carousel";

function SawbladeMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M32 4l3.2 7.4 7.6-2.6-2.2 7.7 7.1 3.7-5.5 5.7 5.5 5.7-7.1 3.7 2.2 7.7-7.6-2.6L32 60l-3.2-7.4-7.6 2.6 2.2-7.7-7.1-3.7 5.5-5.7-5.5-5.7 7.1-3.7-2.2-7.7 7.6 2.6L32 4z" />
      <circle cx="32" cy="32" r="10" fill="#fffef8" />
      <circle cx="32" cy="32" r="4.5" />
    </svg>
  );
}

export function DayClient({
  date,
  initialJobs,
  userName,
}: {
  date: string;
  initialJobs: DashboardJob[];
  userName: string;
}) {
  const firstName = userName.split(" ")[0] || "there";
  const label = formatDayLabel(date);

  return (
    <div className="comic-paper relative min-h-screen overflow-x-hidden text-black">
      <div className="comic-halftone pointer-events-none absolute inset-0 opacity-[0.35]" />

      <header className="relative z-20 border-b-[3px] border-black bg-[#fffef8]/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-3.5 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-black tracking-tight"
          >
            <SawbladeMark className="size-5 text-black" />
            Y.A.W.N
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border-[2.5px] border-black bg-white px-3 text-sm font-bold shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-0.5"
            >
              <Settings className="size-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border-[2.5px] border-black bg-white px-3 text-sm font-bold shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-0.5"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-9 sm:px-6">
        <Link
          href="/dashboard?view=calendar"
          className="inline-flex w-fit items-center gap-2 rounded-md border-[3px] border-black bg-white px-4 py-2.5 text-sm font-black shadow-[4px_4px_0_#000] transition-transform hover:-translate-y-0.5"
        >
          <ArrowLeft className="size-4" />
          Back to calendar
        </Link>

        <section className="relative overflow-hidden rounded-lg border-[3px] border-black bg-[#fffef8] p-6 shadow-[6px_6px_0_#000] sm:p-8">
          <div className="absolute -right-3 -top-3 rotate-12">
            <div className="rounded-md border-[3px] border-black bg-[#ff6b6b] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-[2px_2px_0_#000]">
              {initialJobs.length} yawns
            </div>
          </div>
          <h1 className="font-black tracking-tight text-4xl leading-[0.95] sm:text-5xl md:text-6xl">
            Hey {firstName}
            <br />
            Checking Yawns of {label}
          </h1>
        </section>

        <JobsCarousel
          jobs={initialJobs}
          emptyMessage={`No yawns on ${label}. Pick another day from the calendar.`}
        />
      </main>

      <style>{`
        .comic-paper {
          background-color: #f7f7f2;
          background-image:
            linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px);
          background-size: 22px 22px;
        }
        .comic-halftone {
          background-image: radial-gradient(circle, rgba(0,0,0,0.09) 1px, transparent 1.2px);
          background-size: 10px 10px;
        }
      `}</style>
    </div>
  );
}
