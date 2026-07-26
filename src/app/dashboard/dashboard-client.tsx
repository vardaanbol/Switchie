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
  Share2,
} from "lucide-react";
import { signOut } from "next-auth/react";
import {
  dayKey,
  isFoundToday,
  type DashboardJob,
} from "@/lib/jobs/dashboard-job";
import { filterJobsByExperience } from "@/lib/jobs/experience-filter";
import type { SharedYawnCard } from "@/lib/jobs/shared-yawn";
import { JobsCarousel } from "@/components/jobs/jobs-carousel";
import { SharedYawnsList } from "@/components/jobs/shared-yawns-list";
import { RefreshStepLoader } from "@/components/jobs/refresh-step-loader";
import { FeedbackButton } from "@/components/feedback/feedback-form";
import { SawbladeMark } from "@/components/brand/sawblade-mark";
import {
  AppHeader,
  HeaderAction,
  HeaderLink,
} from "@/components/layout/app-header";

export type { DashboardJob };

type DashboardView = "all" | "saved" | "applied" | "shared" | "calendar";

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

  const agendaDays = useMemo(() => {
    const days: Array<{ key: string; day: number; count: number }> = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${month.year}-${String(month.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const count = counts.get(key) ?? 0;
      if (count > 0) days.push({ key, day: d, count });
    }
    return days;
  }, [counts, daysInMonth, month.month, month.year]);

  function shiftMonth(delta: number) {
    const d = new Date(month.year, month.month + delta, 1);
    onMonthChange({ year: d.getFullYear(), month: d.getMonth() });
  }

  return (
    <section className="rounded-lg border-[3px] border-black bg-white p-3 shadow-[5px_5px_0_#000] sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em]">
            Suggestion calendar
          </p>
          <p className="mt-1 text-sm font-medium text-black/55">
            Tap a day to open its yawns
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="inline-flex size-11 items-center justify-center rounded-md border-[3px] border-black bg-white shadow-[3px_3px_0_#000] transition-transform hover:-translate-y-0.5 sm:size-10"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="min-w-0 flex-1 rounded-md border-[3px] border-black bg-[#ffe566] px-3 py-2.5 text-center text-sm font-black shadow-[3px_3px_0_#000] sm:min-w-[9.5rem] sm:flex-none">
            {MONTH_NAMES[month.month]} {month.year}
          </div>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="inline-flex size-11 items-center justify-center rounded-md border-[3px] border-black bg-white shadow-[3px_3px_0_#000] transition-transform hover:-translate-y-0.5 sm:size-10"
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Compact agenda list on very narrow phones */}
      <div className="space-y-2 min-[400px]:hidden">
        {agendaDays.length === 0 ? (
          <p className="rounded-md border-[2.5px] border-black bg-[#fffef8] p-4 text-sm font-medium text-black/55">
            No yawns this month yet. Hit REFRESH to ink some in.
          </p>
        ) : (
          agendaDays.map((day) => (
            <Link
              key={day.key}
              href={`/dashboard/day/${day.key}`}
              className="flex min-h-11 items-center justify-between gap-3 rounded-md border-[2.5px] border-black bg-[#a8e6ff] px-3 py-3 text-sm font-black shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-0.5"
            >
              <span>
                {MONTH_NAMES[month.month].slice(0, 3)} {day.day}
              </span>
              <span className="inline-flex items-center gap-1.5">
                {day.count} yawn{day.count === 1 ? "" : "s"}
                <ArrowUpRight className="size-4" />
              </span>
            </Link>
          ))
        )}
      </div>

      {/* Grid calendar from ~400px up */}
      <div className="hidden min-[400px]:grid min-[400px]:grid-cols-7 min-[400px]:gap-1.5 sm:gap-2">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div
            key={`${d}-${i}`}
            className="pb-1 text-center text-[11px] font-black uppercase tracking-wider text-black/45 sm:text-[10px]"
          >
            <span className="sm:hidden">{d}</span>
            <span className="hidden sm:inline">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}
            </span>
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
                "group relative flex min-h-11 aspect-square flex-col items-center justify-center rounded-md border-[2.5px] border-black text-sm font-black transition-transform hover:-translate-y-0.5",
                count > 0
                  ? "bg-[#a8e6ff] shadow-[2px_2px_0_#000] hover:bg-[#ffe566]"
                  : "bg-[#fffef8] shadow-[2px_2px_0_#000] hover:bg-[#ffe566]",
                isToday ? "ring-2 ring-black ring-offset-1" : "",
              ].join(" ")}
            >
              <span className="transition-opacity [@media(hover:hover)]:group-hover:opacity-0">
                {cell.day}
              </span>
              <ArrowUpRight className="pointer-events-none absolute size-5 opacity-0 transition-opacity max-sm:hidden [@media(hover:hover)]:group-hover:opacity-100" />
              {count > 0 ? (
                <span className="absolute bottom-0.5 rounded-sm bg-black px-1 text-[10px] font-black text-white sm:bottom-1 sm:text-[9px]">
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
  hasResume = false,
  resumeExperienceYears = null,
}: {
  initialJobs: DashboardJob[];
  userName: string;
  initialView?: DashboardView;
  hasResume?: boolean;
  resumeExperienceYears?: number | null;
}) {
  const now = new Date();
  const firstName = userName.split(" ")[0] || "there";
  const greetings = useMemo(() => greetingLines(firstName), [firstName]);
  const [greetingIndex, setGreetingIndex] = useState(0);
  const [jobs, setJobs] = useState(initialJobs);
  const [shares, setShares] = useState<SharedYawnCard[]>([]);
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

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/shared-yawns");
        const data = await res.json();
        if (active && res.ok) {
          setShares((data.shares ?? []) as SharedYawnCard[]);
        }
      } catch {
        /* shares are additive — ignore load failures */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  /** Saving a share creates a listing server-side — pull it into Saved. */
  async function reloadJobs() {
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      if (!res.ok) return;
      setJobs(
        filterJobsByExperience(
          data.jobs as DashboardJob[],
          resumeExperienceYears ?? data.resumeExperienceYears ?? null,
          2
        )
      );
    } catch {
      /* keep current list on failure */
    }
  }

  const counts = useMemo(
    () => ({
      all: jobs.filter((j) => j.status !== "dismissed" && isFoundToday(j.foundAt))
        .length,
      saved: jobs.filter((j) => j.status === "saved").length,
      applied: jobs.filter((j) => j.status === "applied").length,
      shared: shares.filter((s) => s.status !== "dismissed").length,
    }),
    [jobs, shares]
  );

  const visibleShares = useMemo(
    () => shares.filter((s) => s.status !== "dismissed"),
    [shares]
  );

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      if (view === "saved") return job.status === "saved";
      if (view === "applied") return job.status === "applied";
      if (view === "calendar" || view === "shared") return false;
      // Feed = today's yawns only; older days live on Calendar.
      return job.status !== "dismissed" && isFoundToday(job.foundAt);
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
        if (listRes.ok) {
          setJobs(
            filterJobsByExperience(
              listData.jobs as DashboardJob[],
              resumeExperienceYears ?? listData.resumeExperienceYears ?? null,
              2
            )
          );
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Refresh failed");
      }
    });
  }

  const emptyCopy: Record<DashboardView, string> = {
    all: "No yawns for today yet. Hit REFRESH, or wait for the morning digest.",
    saved: "No saved jobs yet. Hit Save on a role and it’ll show up here.",
    applied: "Nothing applied yet. When you hit Applied!, it lands here.",
    shared:
      "No shared yawns yet. When another Yawner sends you a role, it shows up here.",
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
      id: "shared",
      label: "Shared Yawns",
      icon: <Share2 className="size-3.5" />,
      count: counts.shared,
      accent: "bg-[#c9b6ff]",
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: <CalendarDays className="size-3.5" />,
      accent: "bg-[#ffb4a2]",
    },
  ];

  return (
    <div className="comic-paper relative min-h-dvh overflow-x-hidden text-black">
      <div className="comic-halftone pointer-events-none absolute inset-0 opacity-[0.35]" />

      <SawbladeMark className="pointer-events-none absolute -left-8 top-28 size-28 text-black/[0.06] sm:size-36" />
      <SawbladeMark className="pointer-events-none absolute -right-10 bottom-40 size-40 rotate-12 text-black/[0.05]" />

      <RefreshStepLoader active={refreshing} />

      <AppHeader
        actions={
          <>
            <FeedbackButton />
            <HeaderLink href="/settings" aria-label="Settings">
              <Settings className="size-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </HeaderLink>
            <HeaderAction
              aria-label="Sign out"
              onClick={() => {
                try {
                  sessionStorage.removeItem(`yawn-greeting:${firstName}`);
                } catch {
                  /* ignore */
                }
                signOut({ callbackUrl: "/" });
              }}
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Out</span>
            </HeaderAction>
          </>
        }
      />

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-6 px-3 py-7 sm:gap-8 sm:px-6 sm:py-9">
        <section className="relative overflow-hidden rounded-lg border-[3px] border-black bg-[#fffef8] p-4 shadow-[5px_5px_0_#000] sm:p-8 sm:shadow-[6px_6px_0_#000]">
          <div className="mb-3 sm:absolute sm:-right-3 sm:-top-3 sm:mb-0 sm:rotate-12">
            <div className="inline-block rounded-md border-[3px] border-black bg-[#ff6b6b] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-[2px_2px_0_#000]">
              Issue #
              {Math.max(
                view === "calendar" ? counts.all : filtered.length,
                1
              )}
            </div>
          </div>
          <h1 className="break-words font-black tracking-tight text-3xl leading-[1.05] sm:pr-16 sm:text-5xl sm:leading-[0.95] md:text-6xl">
            {greetings[greetingIndex][0]}
            {greetings[greetingIndex][1] ? (
              <>
                <br />
                {greetings[greetingIndex][1]}
              </>
            ) : null}
          </h1>
          <div className="mt-5 sm:mt-6">
            <button
              type="button"
              onClick={refreshNow}
              disabled={refreshing}
              aria-label={refreshing ? "Searching" : "Refresh jobs"}
              className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-md border-[3px] border-black bg-[#ffe566] px-5 text-sm font-black uppercase tracking-[0.14em] shadow-[4px_4px_0_#000] transition-transform hover:-translate-y-0.5 disabled:opacity-60 sm:h-11 sm:w-auto"
            >
              <RefreshCw
                className={`size-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Searching…" : "Refresh"}
            </button>
          </div>
        </section>

        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {tabs.map((tab) => {
            const active = view === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={active}
                onClick={() => setView(tab.id)}
                className={[
                  "flex min-h-11 items-center justify-between gap-2 rounded-md border-[3px] border-black px-2.5 py-3 text-left shadow-[4px_4px_0_#000] transition-transform hover:-translate-y-0.5 sm:px-3",
                  active ? tab.accent : "bg-white",
                ].join(" ")}
              >
                <span className="inline-flex min-w-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em] sm:gap-2 sm:text-[11px] sm:tracking-[0.12em]">
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
        ) : view === "shared" ? (
          <SharedYawnsList
            shares={visibleShares}
            emptyMessage={emptyCopy.shared}
            onPatch={(id, patch) => {
              setShares((prev) =>
                prev.map((s) => (s._id === id ? { ...s, ...patch } : s))
              );
              if (patch.status === "saved") void reloadJobs();
            }}
          />
        ) : (
          <JobsCarousel
            jobs={filtered}
            emptyMessage={emptyCopy[view]}
            hasResume={hasResume}
            onJobsPatch={(id, patch) => {
              setJobs((prev) =>
                prev.map((j) => (j._id === id ? { ...j, ...patch } : j))
              );
            }}
          />
        )}
      </main>
    </div>
  );
}
