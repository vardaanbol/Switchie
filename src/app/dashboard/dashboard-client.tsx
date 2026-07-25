"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Bookmark,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LogOut,
  RefreshCw,
  Settings,
} from "lucide-react";
import { signOut } from "next-auth/react";
import {
  dayKey,
  type DashboardJob,
} from "@/lib/jobs/dashboard-job";
import { JobsCarousel } from "@/components/jobs/jobs-carousel";

export type { DashboardJob };

type DashboardView = "all" | "saved" | "applied" | "calendar";

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

function greetingLines(name: string): Array<[string, string?]> {
  return [
    [`Keep Yawning ${name}`],
    [`Did You Yawn ${name}`],
    [`Still Yawning ${name}?`],
    [`Yawns For ${name}`],
    [`Wake Up ${name}`, "Time to check your yawns"],
    [`Hey ${name}`, "Yawning More ?"],
  ];
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function SuggestionCalendar({
  jobs,
  month,
  onMonthChange,
}: {
  jobs: DashboardJob[];
  month: { year: number; month: number };
  onMonthChange: (next: { year: number; month: number }) => void;
}) {
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const job of jobs) {
      const key = dayKey(job.foundAt);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [jobs]);

  const first = new Date(month.year, month.month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(month.year, month.month + 1, 0).getDate();
  const todayKey = dayKey(new Date().toISOString());

  const cells: Array<{ key: string; day: number } | null> = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${month.year}-${String(month.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ key, day: d });
  }

  function shiftMonth(delta: number) {
    const d = new Date(month.year, month.month + delta, 1);
    onMonthChange({ year: d.getFullYear(), month: d.getMonth() });
  }

  return (
    <section className="rounded-lg border-[3px] border-black bg-white p-4 shadow-[5px_5px_0_#000] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em]">
            Suggestion calendar
          </p>
          <p className="mt-1 text-sm font-medium text-black/55">
            Hover a day, then open its yawns on a new page
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="inline-flex size-10 items-center justify-center rounded-md border-[3px] border-black bg-white shadow-[3px_3px_0_#000] transition-transform hover:-translate-y-0.5"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="min-w-[9.5rem] rounded-md border-[3px] border-black bg-[#ffe566] px-3 py-2 text-center text-sm font-black shadow-[3px_3px_0_#000]">
            {MONTH_NAMES[month.month]} {month.year}
          </div>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="inline-flex size-10 items-center justify-center rounded-md border-[3px] border-black bg-white shadow-[3px_3px_0_#000] transition-transform hover:-translate-y-0.5"
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="pb-1 text-center text-[10px] font-black uppercase tracking-wider text-black/45"
          >
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (!cell) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }
          const count = counts.get(cell.key) ?? 0;
          const isToday = cell.key === todayKey;
          return (
            <Link
              key={cell.key}
              href={`/dashboard/day/${cell.key}`}
              aria-label={`Open yawns for ${cell.key}`}
              className={[
                "group relative flex aspect-square flex-col items-center justify-center rounded-md border-[2.5px] border-black text-sm font-black transition-transform hover:-translate-y-0.5",
                count > 0
                  ? "bg-[#a8e6ff] shadow-[2px_2px_0_#000] hover:bg-[#ffe566]"
                  : "bg-[#fffef8] shadow-[2px_2px_0_#000] hover:bg-[#ffe566]",
                isToday ? "ring-2 ring-black ring-offset-1" : "",
              ].join(" ")}
            >
              <span className="transition-opacity group-hover:opacity-0">
                {cell.day}
              </span>
              <ArrowUpRight className="pointer-events-none absolute size-5 opacity-0 transition-opacity group-hover:opacity-100" />
              {count > 0 ? (
                <span className="absolute bottom-1 rounded-sm bg-black px-1 text-[9px] font-black text-white">
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function DashboardClient({
  initialJobs,
  userName,
  initialView = "all",
}: {
  initialJobs: DashboardJob[];
  userName: string;
  initialView?: DashboardView;
}) {
  const now = new Date();
  const firstName = userName.split(" ")[0] || "there";
  const greetings = useMemo(() => greetingLines(firstName), [firstName]);
  const [greetingIndex, setGreetingIndex] = useState(0);
  const [jobs, setJobs] = useState(initialJobs);
  const [view, setView] = useState<DashboardView>(initialView);
  const [refreshing, startRefresh] = useTransition();
  const [calendarMonth, setCalendarMonth] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  useEffect(() => {
    const key = `yawn-greeting:${firstName}`;
    try {
      const stored = sessionStorage.getItem(key);
      if (stored != null) {
        const parsed = Number(stored);
        if (Number.isFinite(parsed)) {
          setGreetingIndex(
            ((parsed % greetings.length) + greetings.length) % greetings.length
          );
          return;
        }
      }
      const next = Math.floor(Math.random() * greetings.length);
      sessionStorage.setItem(key, String(next));
      setGreetingIndex(next);
    } catch {
      setGreetingIndex(Math.floor(Math.random() * greetings.length));
    }
  }, [firstName, greetings.length]);

  const counts = useMemo(
    () => ({
      all: jobs.filter((j) => j.status !== "dismissed").length,
      saved: jobs.filter((j) => j.status === "saved").length,
      applied: jobs.filter((j) => j.status === "applied").length,
    }),
    [jobs]
  );

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      if (view === "saved") return job.status === "saved";
      if (view === "applied") return job.status === "applied";
      if (view === "calendar") return false;
      return job.status !== "dismissed";
    });
  }, [jobs, view]);

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

  const emptyCopy: Record<DashboardView, string> = {
    all: "Hit REFRESH to ink in some roles, or wait for the morning digest.",
    saved: "No saved jobs yet. Hit Save on a role and it’ll show up here.",
    applied: "Nothing applied yet. When you hit Applied!, it lands here.",
    calendar: "Open a day on the calendar to check those yawns.",
  };

  const tabs: Array<{
    id: DashboardView;
    label: string;
    icon: React.ReactNode;
    count?: number;
    accent: string;
  }> = [
    {
      id: "all",
      label: "Feed",
      icon: <LayoutGrid className="size-3.5" />,
      count: counts.all,
      accent: "bg-white",
    },
    {
      id: "saved",
      label: "Saved",
      icon: <Bookmark className="size-3.5" />,
      count: counts.saved,
      accent: "bg-[#a8e6ff]",
    },
    {
      id: "applied",
      label: "Applied",
      icon: <Briefcase className="size-3.5" />,
      count: counts.applied,
      accent: "bg-[#ffe566]",
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: <CalendarDays className="size-3.5" />,
      accent: "bg-[#ffb4a2]",
    },
  ];

  return (
    <div className="comic-paper relative min-h-screen overflow-x-hidden text-black">
      <div className="comic-halftone pointer-events-none absolute inset-0 opacity-[0.35]" />

      <SawbladeMark className="pointer-events-none absolute -left-8 top-28 size-28 text-black/[0.06] sm:size-36" />
      <SawbladeMark className="pointer-events-none absolute -right-10 bottom-40 size-40 rotate-12 text-black/[0.05]" />

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
              onClick={refreshNow}
              disabled={refreshing}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border-[2.5px] border-black bg-[#ffe566] px-3.5 text-sm font-black shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              <RefreshCw
                className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "SEARCH…" : "REFRESH"}
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.removeItem(`yawn-greeting:${firstName}`);
                } catch {
                  /* ignore */
                }
                signOut({ callbackUrl: "/" });
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border-[2.5px] border-black bg-white px-3 text-sm font-bold shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-0.5"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-9 sm:px-6">
        <section className="relative overflow-hidden rounded-lg border-[3px] border-black bg-[#fffef8] p-6 shadow-[6px_6px_0_#000] sm:p-8">
          <div className="absolute -right-3 -top-3 rotate-12">
            <div className="rounded-md border-[3px] border-black bg-[#ff6b6b] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-[2px_2px_0_#000]">
              Issue #{Math.max(view === "calendar" ? counts.all : filtered.length, 1)}
            </div>
          </div>
          <h1 className="font-black tracking-tight text-4xl leading-[0.95] sm:text-5xl md:text-6xl">
            {greetings[greetingIndex][0]}
            {greetings[greetingIndex][1] ? (
              <>
                <br />
                {greetings[greetingIndex][1]}
              </>
            ) : null}
          </h1>
        </section>

        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tabs.map((tab) => {
            const active = view === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setView(tab.id)}
                className={[
                  "flex items-center justify-between gap-2 rounded-md border-[3px] border-black px-3 py-3 text-left shadow-[4px_4px_0_#000] transition-transform hover:-translate-y-0.5",
                  active ? tab.accent : "bg-white",
                ].join(" ")}
              >
                <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em]">
                  {tab.icon}
                  {tab.label}
                </span>
                {typeof tab.count === "number" ? (
                  <span className="rounded-sm border-2 border-black bg-black px-1.5 py-0.5 text-[10px] font-black text-white">
                    {tab.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {view === "calendar" ? (
          <SuggestionCalendar
            jobs={jobs}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
          />
        ) : (
          <JobsCarousel jobs={filtered} emptyMessage={emptyCopy[view]} />
        )}
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
