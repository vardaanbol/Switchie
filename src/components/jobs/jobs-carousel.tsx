"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
} from "lucide-react";
import type { JobStatus } from "@/models";
import type { DashboardJob } from "@/lib/jobs/dashboard-job";

function formatInr(n?: number) {
  if (typeof n !== "number") return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatShortDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const TILTS = [
  "-rotate-[0.6deg]",
  "rotate-[0.55deg]",
  "-rotate-[0.35deg]",
  "rotate-[0.4deg]",
];

function carouselPages(
  current: number,
  total: number,
  siblings = 1
): Array<number | "…"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i);
  }

  const pages = new Set<number>();
  pages.add(0);
  pages.add(total - 1);
  for (
    let i = Math.max(0, current - siblings);
    i <= Math.min(total - 1, current + siblings);
    i++
  ) {
    pages.add(i);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result: Array<number | "…"> = [];
  for (let i = 0; i < sorted.length; i++) {
    const page = sorted[i];
    if (i > 0 && page - sorted[i - 1] > 1) result.push("…");
    result.push(page);
  }
  return result;
}

function JobCard({
  job,
  index,
  pendingId,
  expanded,
  onToggle,
  onUpdateStatus,
}: {
  job: DashboardJob;
  index: number;
  pendingId: string | null;
  expanded: boolean;
  onToggle: () => void;
  onUpdateStatus: (id: string, next: JobStatus) => void;
}) {
  const min = formatInr(job.salaryEstimateMin);
  const max = formatInr(job.salaryEstimateMax);
  const salary =
    min && max
      ? `${min} – ${max}${job.salaryIsEstimate ? " · est." : ""}`
      : "Salary n/a";
  const tilt = TILTS[index % TILTS.length];
  const suggestedOn = formatShortDate(job.foundAt);
  const savedOn = formatShortDate(job.savedAt);
  const appliedOn = formatShortDate(job.appliedAt);

  return (
    <article
      className={`relative rounded-lg border-[3px] border-black bg-[#fffef8] p-5 shadow-[6px_6px_0_#000] transition-transform hover:-translate-y-1 hover:shadow-[8px_8px_0_#000] sm:p-6 ${tilt}`}
    >
      <div className="absolute -left-1.5 top-6 h-8 w-3 rounded-sm border-2 border-black bg-[#c4c4c4]" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            {job.title}
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold text-black/60">
            <span className="text-black">{job.company}</span>
            <span className="inline-flex items-center gap-1 font-medium text-black">
              <MapPin className="size-3.5 shrink-0" />
              {job.location?.trim() || "Location n/a"}
            </span>
            {job.workMode ? (
              <span className="rounded-sm border-2 border-black bg-white px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                {job.workMode}
              </span>
            ) : null}
          </div>
        </div>

        <div className="relative shrink-0">
          <div className="flex size-[4.5rem] rotate-6 flex-col items-center justify-center rounded-full border-[3px] border-black bg-[#ffe566] shadow-[3px_3px_0_#000]">
            <span className="text-lg font-black leading-none">
              {job.matchScore}%
            </span>
            <span className="text-[8px] font-black uppercase tracking-wider">
              match
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-sm border-2 border-black bg-white px-2.5 py-1 text-sm font-bold">
          {salary}
        </div>
        <span className="inline-flex items-center gap-1 rounded-sm border-2 border-black bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          <MapPin className="size-3" />
          {job.location?.trim() || "Location n/a"}
        </span>
        <span className="rounded-sm border-2 border-black bg-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
          {job.status}
        </span>
        {suggestedOn ? (
          <span className="rounded-sm border-2 border-black bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black/55">
            Found {suggestedOn}
          </span>
        ) : null}
        {savedOn && job.status === "saved" ? (
          <span className="rounded-sm border-2 border-black bg-[#a8e6ff] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            Saved {savedOn}
          </span>
        ) : null}
        {appliedOn && job.status === "applied" ? (
          <span className="rounded-sm border-2 border-black bg-[#ffe566] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            Applied {appliedOn}
          </span>
        ) : null}
      </div>

      <div className="mt-4 rounded-md border-[2.5px] border-black bg-white p-3.5 text-[15px] font-medium leading-relaxed text-black/80">
        {job.description}
      </div>

      <div className="mt-3">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={onToggle}
          className={[
            "flex w-full items-center justify-between gap-3 rounded-md border-[3px] border-black bg-white px-4 py-3 text-left shadow-[4px_4px_0_#000] transition-transform hover:-translate-y-0.5",
            expanded ? "bg-[#ffe566]" : "",
          ].join(" ")}
        >
          <span className="text-[11px] font-black uppercase tracking-[0.14em]">
            {expanded ? "Hide details" : "Pros / cons & referrals"}
          </span>
          <ChevronDown
            className={[
              "size-4 shrink-0 transition-transform",
              expanded ? "rotate-180" : "",
            ].join(" ")}
          />
        </button>

        {expanded && (
          <div className="mt-2 grid gap-3 rounded-md border-[3px] border-black bg-white p-3 shadow-[4px_4px_0_#000] sm:grid-cols-2">
            <div className="rounded-md border-[2.5px] border-black bg-[#e8fff0] p-3">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em]">
                ★ Pros
              </p>
              <ul className="space-y-1.5 text-sm font-medium">
                {job.pros.map((p) => (
                  <li key={p}>+ {p}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border-[2.5px] border-black bg-[#ffe8e8] p-3">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em]">
                ✕ Cons
              </p>
              <ul className="space-y-1.5 text-sm font-medium">
                {job.cons.map((c) => (
                  <li key={c}>− {c}</li>
                ))}
              </ul>
            </div>
            {job.referralContacts?.length > 0 && (
              <div className="rounded-md border-[2.5px] border-black bg-white p-3 sm:col-span-2">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em]">
                  Cameos · Referrals
                </p>
                <ul className="flex flex-wrap gap-2">
                  {job.referralContacts.map((c) => (
                    <a
                      key={c.profileUrl}
                      href={c.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md border-2 border-black bg-[#ffe566] px-2.5 py-1 text-sm font-bold shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-0.5"
                    >
                      {c.name} · {c.title}
                    </a>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t-[3px] border-black pt-4">
        <a
          href={job.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center gap-1.5 rounded-md border-[2.5px] border-black bg-white px-3.5 text-sm font-bold shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-0.5"
        >
          <ExternalLink className="size-3.5" />
          View
        </a>
        <button
          type="button"
          disabled={pendingId === job._id || job.status === "saved"}
          onClick={() => onUpdateStatus(job._id, "saved")}
          className="inline-flex h-10 items-center rounded-md border-[2.5px] border-black bg-[#a8e6ff] px-3.5 text-sm font-bold shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          {job.status === "saved" ? "Saved ✓" : "Save"}
        </button>
        <button
          type="button"
          disabled={pendingId === job._id || job.status === "applied"}
          onClick={() => onUpdateStatus(job._id, "applied")}
          className="inline-flex h-10 items-center rounded-md border-[2.5px] border-black bg-black px-3.5 text-sm font-black text-white shadow-[2px_2px_0_#333] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          {job.status === "applied" ? "Applied ✓" : "Applied!"}
        </button>
        <button
          type="button"
          disabled={pendingId === job._id}
          onClick={() => onUpdateStatus(job._id, "dismissed")}
          className="inline-flex h-10 items-center rounded-md border-[2.5px] border-black bg-white px-3.5 text-sm font-bold text-black/50 shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-0.5 hover:text-black disabled:opacity-50"
        >
          Pass
        </button>
      </div>
    </article>
  );
}

export function JobsCarousel({
  jobs,
  emptyMessage,
}: {
  jobs: DashboardJob[];
  emptyMessage: string;
}) {
  const [items, setItems] = useState(jobs);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    setItems(jobs);
    setCarouselIndex(0);
  }, [jobs]);

  useEffect(() => {
    if (items.length === 0) {
      setCarouselIndex(0);
      return;
    }
    setCarouselIndex((i) => Math.min(i, items.length - 1));
  }, [items.length]);

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

      const updated = data.job as Partial<DashboardJob> & { _id: string };
      setItems((prev) =>
        prev.map((j) =>
          j._id === id
            ? {
                ...j,
                status: next,
                savedAt:
                  updated.savedAt !== undefined ? updated.savedAt : j.savedAt,
                appliedAt:
                  updated.appliedAt !== undefined
                    ? updated.appliedAt
                    : j.appliedAt,
              }
            : j
        )
      );

      if (next === "saved") toast.success("Saved — find it in the Saved tab");
      else if (next === "applied")
        toast.success("Marked applied — see it under Applied");
      else toast.success(`Marked as ${next}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setPendingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border-[3px] border-dashed border-black bg-[#fffef8] px-8 py-16 text-center shadow-[4px_4px_0_#000]">
        <p className="text-2xl font-black tracking-tight">BLANK PAGE</p>
        <p className="mx-auto mt-2 max-w-sm text-sm font-medium text-black/55">
          {emptyMessage}
        </p>
      </div>
    );
  }

  const current = items[carouselIndex];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {carouselPages(carouselIndex, items.length).map((item, idx) => {
          if (item === "…") {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="px-1 text-sm font-black text-black/35"
              >
                …
              </span>
            );
          }
          const active = item === carouselIndex;
          return (
            <button
              key={items[item]._id}
              type="button"
              aria-label={`Go to job ${item + 1}`}
              aria-current={active ? "true" : undefined}
              onClick={() => setCarouselIndex(item)}
              className={[
                "inline-flex min-w-10 items-center justify-center rounded-md border-[2.5px] border-black px-2.5 py-1.5 text-sm font-black shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-0.5",
                active ? "bg-[#ffe566]" : "bg-white",
              ].join(" ")}
            >
              {item + 1}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2 sm:gap-4">
        <button
          type="button"
          aria-label="Previous job"
          disabled={items.length <= 1}
          onClick={() =>
            setCarouselIndex((i) => (i - 1 + items.length) % items.length)
          }
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-md border-[3px] border-black bg-white shadow-[4px_4px_0_#000] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 sm:size-14"
        >
          <ChevronLeft className="size-6" />
        </button>

        <div className="min-w-0 flex-1">
          <JobCard
            key={current._id}
            job={current}
            index={carouselIndex}
            pendingId={pendingId}
            expanded={!!expanded[current._id]}
            onToggle={() =>
              setExpanded((e) => ({
                ...e,
                [current._id]: !e[current._id],
              }))
            }
            onUpdateStatus={updateStatus}
          />
        </div>

        <button
          type="button"
          aria-label="Next job"
          disabled={items.length <= 1}
          onClick={() => setCarouselIndex((i) => (i + 1) % items.length)}
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-md border-[3px] border-black bg-white shadow-[4px_4px_0_#000] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 sm:size-14"
        >
          <ChevronRight className="size-6" />
        </button>
      </div>

      <p className="text-center text-[11px] font-black uppercase tracking-[0.16em] text-black/45">
        Yawn {carouselIndex + 1} of {items.length}
      </p>
    </div>
  );
}
