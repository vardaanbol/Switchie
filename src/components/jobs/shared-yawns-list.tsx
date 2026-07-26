"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ExternalLink,
  MapPin,
  MessageSquare,
  Share2,
} from "lucide-react";
import type { SharedYawnCard } from "@/lib/jobs/shared-yawn";

function formatInr(n?: number) {
  if (typeof n !== "number") return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(n);
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function isLinkedInProfile(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").endsWith("linkedin.com");
  } catch {
    return false;
  }
}

function SharedCard({
  share,
  pending,
  onUpdate,
}: {
  share: SharedYawnCard;
  pending: boolean;
  onUpdate: (status: "saved" | "dismissed") => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const min = formatInr(share.salaryEstimateMin);
  const max = formatInr(share.salaryEstimateMax);
  const salaryRange = min && max ? `${min} – ${max}` : min || max;
  const salary = salaryRange
    ? `${salaryRange}${share.salaryIsEstimate ? " (est.)" : ""}`
    : "Salary not listed";

  const referrals = (share.referralContacts ?? []).filter((c) =>
    isLinkedInProfile(c.profileUrl)
  );
  const pros = share.pros ?? [];
  const cons = share.cons ?? [];
  const hasDetails = pros.length > 0 || cons.length > 0 || referrals.length > 0;

  return (
    <article className="relative rounded-lg border-[3px] border-black bg-[#fffef8] p-4 shadow-[5px_5px_0_#000] sm:p-6 sm:shadow-[6px_6px_0_#000]">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md border-[2.5px] border-black bg-[#c9b6ff] px-2 py-1 text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0_#000]">
          <Share2 className="size-3" />
          Shared by {share.sharedByName}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-black/40">
          {formatShortDate(share.sharedAt)}
        </span>
        {share.status === "saved" ? (
          <span className="rounded-sm border-2 border-black bg-[#a8e6ff] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
            Saved
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="break-words text-xl font-black tracking-tight sm:text-3xl">
            {share.title}
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold text-black/60">
            <span className="min-w-0 break-words text-black">
              {share.company}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1 break-words font-medium text-black">
              <MapPin className="size-3.5 shrink-0" />
              {share.location?.trim() || "Location n/a"}
            </span>
            {share.workMode ? (
              <span className="rounded-sm border-2 border-black bg-white px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                {share.workMode}
              </span>
            ) : null}
          </div>
        </div>

        <div className="relative shrink-0">
          <div className="flex size-14 rotate-6 flex-col items-center justify-center rounded-full border-[3px] border-black bg-[#ffe566] shadow-[3px_3px_0_#000] sm:size-[4.5rem]">
            <span className="text-base font-black leading-none sm:text-lg">
              {share.matchScore}%
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
        {typeof share.requiredExperienceYears === "number" ? (
          <span className="rounded-sm border-2 border-black bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black/55">
            JD asks {share.requiredExperienceYears}y
          </span>
        ) : null}
      </div>

      {share.comment ? (
        <div className="mt-4 rounded-md border-[2.5px] border-black bg-[#fff1a8] px-3 py-2.5 shadow-[2px_2px_0_#000]">
          <p className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-black/55">
            <MessageSquare className="size-3" />
            {share.sharedByName} said
          </p>
          <p className="text-sm font-medium leading-relaxed">{share.comment}</p>
        </div>
      ) : null}

      {share.description ? (
        <div className="mt-4 rounded-md border-[2.5px] border-black bg-white p-3 text-[15px] font-medium leading-relaxed break-anywhere text-black/80 sm:p-3.5">
          {share.description}
        </div>
      ) : null}

      {hasDetails ? (
        <div className="mt-3">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            className={[
              "flex min-h-11 w-full items-center justify-between gap-3 rounded-md border-[3px] border-black bg-white px-3 py-3 text-left shadow-[4px_4px_0_#000] transition-transform hover:-translate-y-0.5 sm:px-4",
              expanded ? "bg-[#ffe566]" : "",
            ].join(" ")}
          >
            <span className="text-[10px] font-black uppercase tracking-[0.12em] sm:text-[11px] sm:tracking-[0.14em]">
              {expanded ? "Hide details" : "Pros / cons & referrals"}
            </span>
            <ChevronDown
              className={[
                "size-4 shrink-0 transition-transform",
                expanded ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>

          {expanded ? (
            <div className="mt-2 grid gap-3 rounded-md border-[3px] border-black bg-white p-3 shadow-[4px_4px_0_#000] sm:grid-cols-2">
              {pros.length > 0 ? (
                <div className="rounded-md border-[2.5px] border-black bg-[#e8fff0] p-3">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em]">
                    ★ Pros
                  </p>
                  <ul className="space-y-1.5 text-sm font-medium">
                    {pros.map((p) => (
                      <li key={p}>+ {p}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {cons.length > 0 ? (
                <div className="rounded-md border-[2.5px] border-black bg-[#fff0f0] p-3">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em]">
                    ! Cons
                  </p>
                  <ul className="space-y-1.5 text-sm font-medium">
                    {cons.map((c) => (
                      <li key={c}>- {c}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {referrals.length > 0 ? (
                <div className="rounded-md border-[2.5px] border-black bg-white p-3 sm:col-span-2">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em]">
                    LinkedIn referrals · current employees
                  </p>
                  <ul className="space-y-2">
                    {referrals.map((c) => (
                      <li key={c.profileUrl}>
                        <a
                          href={c.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-h-11 items-center justify-between gap-2 rounded-md border-[2.5px] border-black bg-[#fffef8] px-3 py-2 text-sm font-bold shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-0.5"
                        >
                          <span className="min-w-0">
                            <span className="block truncate">{c.name}</span>
                            <span className="block truncate text-xs font-medium text-black/55">
                              {c.title}
                            </span>
                          </span>
                          <ExternalLink className="size-3.5 shrink-0" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-2 border-t-[3px] border-black pt-4 sm:flex sm:flex-wrap">
        <a
          href={share.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md border-[2.5px] border-black bg-white px-3.5 text-sm font-bold shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-0.5 sm:h-10"
        >
          <ExternalLink className="size-3.5" />
          View
        </a>
        <button
          type="button"
          disabled={pending || share.status === "saved"}
          onClick={() => onUpdate("saved")}
          className="inline-flex h-11 items-center justify-center rounded-md border-[2.5px] border-black bg-[#a8e6ff] px-3.5 text-sm font-bold shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-0.5 disabled:opacity-50 sm:h-10"
        >
          {share.status === "saved" ? "Saved ✓" : "Save"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onUpdate("dismissed")}
          className="inline-flex h-11 items-center justify-center rounded-md border-[2.5px] border-black bg-white px-3.5 text-sm font-bold text-black/50 shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-0.5 hover:text-black disabled:opacity-50 sm:h-10"
        >
          Pass
        </button>
      </div>
    </article>
  );
}

export function SharedYawnsList({
  shares,
  emptyMessage,
  onPatch,
}: {
  shares: SharedYawnCard[];
  emptyMessage: string;
  onPatch: (id: string, patch: Partial<SharedYawnCard>) => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function update(id: string, status: "saved" | "dismissed") {
    setPendingId(id);
    try {
      const res = await fetch(`/api/shared-yawns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Update failed"
        );
      }
      onPatch(id, { status });
      toast.success(
        status === "saved" ? "Yawn added to your Saved list" : "Yawn passed"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setPendingId(null);
    }
  }

  if (shares.length === 0) {
    return (
      <section className="rounded-lg border-[3px] border-black bg-white p-5 shadow-[5px_5px_0_#000] sm:p-6">
        <p className="text-sm font-medium text-black/55">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {shares.map((share) => (
        <SharedCard
          key={share._id}
          share={share}
          pending={pendingId === share._id}
          onUpdate={(status) => update(share._id, status)}
        />
      ))}
    </div>
  );
}
