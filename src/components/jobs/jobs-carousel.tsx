"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Briefcase,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  RefreshCw,
  Save,
  X,
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

function isLinkedInProfile(url: string) {
  return /linkedin\.com\/in\//i.test(url);
}

function resumeMatchChipClass(score: number) {
  if (score >= 90) return "bg-[#e8fff0]";
  if (score >= 70) return "bg-[#ffe566]";
  return "bg-[#ffe8e8]";
}

function formatYears(years: number) {
  return `${years % 1 === 0 ? years : years.toFixed(1)} yr${years === 1 ? "" : "s"}`;
}

function LinkedInMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.23 0z" />
    </svg>
  );
}

function downloadTex(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/x-tex;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function EnhancedResumeModal({
  open,
  onClose,
  job,
  tips,
  additions,
  stillMissing,
  markdown,
  tex,
  enhancing,
  onRegenerate,
}: {
  open: boolean;
  onClose: () => void;
  job: DashboardJob;
  tips: string[];
  additions: string[];
  stillMissing: string[];
  markdown: string;
  tex: string;
  enhancing: boolean;
  onRegenerate: () => void;
}) {
  if (!open) return null;

  const safeName = `${job.company}-${job.title}`
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);

  const generatedOn = formatShortDate(job.enhancedResumeAt);
  const legacyChanges = tips
    .filter((t) => t.startsWith("Change: "))
    .map((t) => t.replace(/^Change:\s*/, ""));
  const shownAdditions =
    additions.length > 0 ? additions : legacyChanges;
  const displayTips = tips.filter((t) => !t.startsWith("Change: "));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Enhanced ATS resume"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border-[3px] border-black bg-[#fffef8] p-5 shadow-[8px_8px_0_#000] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-black/50">
              ATS Enhanced Resume
            </p>
            <h3 className="text-xl font-black leading-tight sm:text-2xl">
              {job.title} · {job.company}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-md border-2 border-black bg-white shadow-[2px_2px_0_#000]"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="mb-2 text-sm font-medium text-black/70">
          Ready to upload after you compile the .tex in Overleaf. Everything
          below comes from your resume — we only rephrased and emphasized what
          already matches this JD.
        </p>

        <p className="mb-3 inline-flex items-center gap-1.5 rounded-sm border-2 border-black bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
          <Save className="size-3" />
          {generatedOn
            ? `Saved ${generatedOn} · reused until you upload a new resume`
            : "Saved to this job"}
        </p>

        {shownAdditions.length > 0 ? (
          <div className="mb-4 rounded-md border-[2.5px] border-black bg-[#e8fff0] p-3">
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em]">
              What we added for this match
            </p>
            <p className="mb-2 text-xs font-medium text-black/55">
              These are the JD-aligned updates on your enhanced resume — check
              them before you upload.
            </p>
            <ul className="space-y-1.5 text-sm font-medium">
              {shownAdditions.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="shrink-0 font-black text-black">+</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {stillMissing.length > 0 ? (
          <div className="mb-4 rounded-md border-[2.5px] border-black bg-[#fff4e0] p-3">
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em]">
              Still missing (not invented)
            </p>
            <p className="mb-2 text-xs font-medium text-black/55">
              The JD asks for these, but they weren’t on your resume — we left
              them out on purpose.
            </p>
            <ul className="space-y-1.5 text-sm font-medium">
              {stillMissing.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="shrink-0 font-black text-black">−</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {displayTips.length > 0 ? (
          <div className="mb-4 rounded-md border-[2.5px] border-black bg-[#e8f4ff] p-3">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em]">
              ATS tips
            </p>
            <ul className="space-y-1.5 text-sm font-medium">
              {displayTips.map((t) => (
                <li key={t}>• {t}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-black/50">
          Preview
        </p>
        <div className="mb-4 max-h-64 overflow-y-auto rounded-md border-[2.5px] border-black bg-white p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
          {markdown || "No preview yet."}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!tex || enhancing}
            onClick={() => {
              downloadTex(`${safeName}-ats-resume.tex`, tex);
              toast.success("Downloaded .tex — open it in Overleaf");
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-md border-[2.5px] border-black bg-black px-3.5 text-sm font-black text-white shadow-[2px_2px_0_#333] disabled:opacity-50"
          >
            <Download className="size-3.5" />
            Download .tex
          </button>
          <button
            type="button"
            disabled={!markdown || enhancing}
            onClick={async () => {
              await navigator.clipboard.writeText(markdown);
              toast.success("Markdown copied");
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-md border-[2.5px] border-black bg-white px-3.5 text-sm font-bold shadow-[2px_2px_0_#000] disabled:opacity-50"
          >
            <Copy className="size-3.5" />
            Copy Markdown
          </button>
          <a
            href="https://www.overleaf.com/project"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-1.5 rounded-md border-[2.5px] border-black bg-[#a8e6ff] px-3.5 text-sm font-bold shadow-[2px_2px_0_#000]"
          >
            <ExternalLink className="size-3.5" />
            Open Overleaf
          </a>
          <button
            type="button"
            disabled={enhancing}
            onClick={onRegenerate}
            className="inline-flex h-10 items-center gap-1.5 rounded-md border-[2.5px] border-black bg-white px-3.5 text-sm font-bold shadow-[2px_2px_0_#000] disabled:opacity-50"
          >
            {enhancing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Regenerate
          </button>
        </div>
      </div>
    </div>
  );
}

function JobCard({
  job,
  index,
  pendingId,
  expanded,
  hasResume,
  onToggle,
  onUpdateStatus,
  onReferralsUpdate,
  onJobPatch,
}: {
  job: DashboardJob;
  index: number;
  pendingId: string | null;
  expanded: boolean;
  hasResume: boolean;
  onToggle: () => void;
  onUpdateStatus: (id: string, next: JobStatus) => void;
  onReferralsUpdate: (
    id: string,
    contacts: DashboardJob["referralContacts"]
  ) => void;
  onJobPatch: (id: string, patch: Partial<DashboardJob>) => void;
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

  const linkedInContacts = (job.referralContacts ?? []).filter((c) =>
    isLinkedInProfile(c.profileUrl)
  );
  const [findingReferrals, setFindingReferrals] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [searchedEmpty, setSearchedEmpty] = useState(false);

  const [scoringResume, setScoringResume] = useState(false);
  const [resumeScoreError, setResumeScoreError] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const resumeScore =
    typeof job.resumeMatchScore === "number" ? job.resumeMatchScore : null;
  const jdYears =
    typeof job.requiredExperienceYears === "number"
      ? job.requiredExperienceYears
      : typeof job.resumeMatchRequiredYears === "number"
        ? job.resumeMatchRequiredYears
        : null;
  const yourYears =
    typeof job.resumeMatchExperienceYears === "number"
      ? job.resumeMatchExperienceYears
      : null;

  async function findReferrals(force = false) {
    if (findingReferrals) return;
    if (!force && linkedInContacts.length > 0) return;

    setFindingReferrals(true);
    setReferralError(null);
    try {
      const res = await fetch(`/api/jobs/${job._id}/referrals`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Referral search failed");

      const contacts =
        (data.referralContacts as DashboardJob["referralContacts"]) ?? [];
      onReferralsUpdate(job._id, contacts);
      setSearchedEmpty(contacts.length === 0);
      if (contacts.length > 0) {
        toast.success(
          `Found ${contacts.length} LinkedIn referral${contacts.length === 1 ? "" : "s"}`
        );
      }
    } catch (err) {
      setReferralError(
        err instanceof Error ? err.message : "Referral search failed"
      );
    } finally {
      setFindingReferrals(false);
    }
  }

  async function scoreResumeMatch(force = false) {
    if (scoringResume) return;
    if (!force && resumeScore != null) return;
    if (!hasResume) {
      setResumeScoreError("Upload a resume in Settings to score Resume Match.");
      return;
    }

    setScoringResume(true);
    setResumeScoreError(null);
    try {
      const res = await fetch(`/api/jobs/${job._id}/resume-match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ??
            (res.status === 503
              ? "Gemini is temporarily overloaded. Please try again in a moment."
              : "Resume match failed")
        );
      }

      onJobPatch(job._id, {
        resumeMatchScore: data.resumeMatchScore,
        resumeMatchGaps: data.resumeMatchGaps ?? [],
        resumeMatchExperienceYears: data.resumeMatchExperienceYears ?? null,
        resumeMatchRequiredYears: data.resumeMatchRequiredYears ?? null,
        resumeMatchExperienceVerdict:
          data.resumeMatchExperienceVerdict ?? null,
        resumeMatchAt: data.resumeMatchAt
          ? new Date(data.resumeMatchAt).toISOString()
          : new Date().toISOString(),
      });
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Resume match failed";
      setResumeScoreError(
        /overloaded|high demand|UNAVAILABLE|503/i.test(raw)
          ? "Gemini is temporarily overloaded. Please try again in a moment."
          : raw
      );
    } finally {
      setScoringResume(false);
    }
  }

  async function enhanceResume(force = false) {
    if (enhancing) return;
    if (!hasResume) {
      toast.error("Upload a resume in Settings first");
      return;
    }

    if (!force && job.enhancedResumeTex && job.enhancedResumeMarkdown) {
      setModalOpen(true);
      return;
    }

    setEnhancing(true);
    try {
      const res = await fetch(`/api/jobs/${job._id}/enhance-resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Enhance failed");

      onJobPatch(job._id, {
        enhancedResumeTex: data.enhancedResumeTex,
        enhancedResumeMarkdown: data.enhancedResumeMarkdown,
        enhancedResumeAtsTips: data.enhancedResumeAtsTips ?? [],
        enhancedResumeAdditions: data.enhancedResumeAdditions ?? [],
        enhancedResumeStillMissing: data.enhancedResumeStillMissing ?? [],
        enhancedResumeAt: data.enhancedResumeAt
          ? new Date(data.enhancedResumeAt).toISOString()
          : new Date().toISOString(),
      });
      setModalOpen(true);
      toast.success("Enhanced ATS resume ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enhance failed");
    } finally {
      setEnhancing(false);
    }
  }

  useEffect(() => {
    if (!expanded) return;
    if (linkedInContacts.length > 0) return;
    if (searchedEmpty || referralError) return;
    void findReferrals();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once when panel opens empty
  }, [expanded, job._id]);

  useEffect(() => {
    if (!expanded) return;
    if (resumeScore != null) return;
    if (resumeScoreError) return;
    void scoreResumeMatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- score once when panel opens
  }, [expanded, job._id, hasResume]);

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
        {resumeScore != null ? (
          <span
            className={`rounded-sm border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${resumeMatchChipClass(resumeScore)}`}
          >
            Resume match: {resumeScore}%
          </span>
        ) : null}
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
            {expanded
              ? "Hide details"
              : "Pros / cons, referrals & resume match"}
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

            <div className="rounded-md border-[2.5px] border-black bg-[#fff4e0] p-3 sm:col-span-2">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em]">
                  <FileText className="size-3.5" />
                  Resume match · vs this JD
                </p>
                {scoringResume ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-black/50">
                    <Loader2 className="size-3 animate-spin" />
                    Scoring…
                  </span>
                ) : null}
              </div>

              {!hasResume ? (
                <p className="text-sm font-medium text-black/55">
                  Upload a resume in{" "}
                  <Link href="/settings" className="font-black underline">
                    Settings
                  </Link>{" "}
                  to score Resume Match and generate an Enhanced Resume.
                </p>
              ) : resumeScoreError ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-black/55">
                    {resumeScoreError}
                  </p>
                  <button
                    type="button"
                    disabled={scoringResume}
                    onClick={() => void scoreResumeMatch(true)}
                    className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0_#000] disabled:opacity-50"
                  >
                    {scoringResume ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3" />
                    )}
                    Try again
                  </button>
                </div>
              ) : resumeScore == null ? (
                <p className="text-sm font-medium text-black/55">
                  Scoring your resume against this job description…
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-sm border-2 border-black px-2.5 py-1 text-sm font-black ${resumeMatchChipClass(resumeScore)}`}
                    >
                      Resume match: {resumeScore}%
                    </span>
                    <button
                      type="button"
                      disabled={scoringResume}
                      title="Re-score against your latest resume"
                      onClick={() => void scoreResumeMatch(true)}
                      className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0_#000] disabled:opacity-50"
                    >
                      {scoringResume ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <RefreshCw className="size-3" />
                      )}
                      Rescore
                    </button>
                    {resumeScore >= 90 ? (
                      <span className="text-sm font-medium text-black/70">
                        Resume already strong for this JD.
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={enhancing}
                        onClick={() => void enhanceResume(false)}
                        className="inline-flex items-center gap-1.5 rounded-md border-2 border-black bg-black px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-white shadow-[2px_2px_0_#333] disabled:opacity-50"
                      >
                        {enhancing ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <FileText className="size-3" />
                        )}
                        {enhancing ? "Enhancing…" : "Enhanced Resume"}
                      </button>
                    )}
                    {job.enhancedResumeTex ? (
                      <button
                        type="button"
                        onClick={() => setModalOpen(true)}
                        className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-white px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0_#000]"
                      >
                        View what we added
                      </button>
                    ) : null}
                  </div>

                  {jdYears != null || yourYears != null ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-sm border-2 border-black bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                        <Briefcase className="size-3" />
                        {yourYears != null
                          ? `${formatYears(yourYears)} you`
                          : "Experience"}
                        {jdYears != null ? ` · JD ${formatYears(jdYears)}` : ""}
                      </span>
                      <span className="text-xs font-medium text-black/50">
                        Within ±2 years band
                      </span>
                    </div>
                  ) : null}
                  {(job.enhancedResumeAdditions?.length ?? 0) > 0 ? (
                    <ul className="space-y-1 rounded-md border-2 border-black bg-[#e8fff0] p-2.5 text-sm font-medium">
                      <li className="text-[10px] font-black uppercase tracking-[0.14em] text-black/55">
                        Ready to upload · what we emphasized
                      </li>
                      {job.enhancedResumeAdditions!.slice(0, 3).map((a) => (
                        <li key={a}>+ {a}</li>
                      ))}
                      {(job.enhancedResumeAdditions?.length ?? 0) > 3 ? (
                        <li className="text-xs font-bold text-black/50">
                          +{job.enhancedResumeAdditions!.length - 3} more in
                          preview
                        </li>
                      ) : null}
                    </ul>
                  ) : null}
                  {(job.resumeMatchGaps?.length ?? 0) > 0 && resumeScore < 90 ? (
                    <ul className="space-y-1 text-sm font-medium text-black/65">
                      {job.resumeMatchGaps!.slice(0, 5).map((g) => (
                        <li key={g}>− Gap: {g}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}
            </div>

            <div className="rounded-md border-[2.5px] border-black bg-[#e8f4ff] p-3 sm:col-span-2">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em]">
                  <LinkedInMark className="size-3.5" />
                  LinkedIn referrals · current employees
                </p>
                <button
                  type="button"
                  disabled={findingReferrals}
                  onClick={() => {
                    setSearchedEmpty(false);
                    void findReferrals(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {findingReferrals ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3" />
                  )}
                  {findingReferrals ? "Searching…" : "Find again"}
                </button>
              </div>

              {findingReferrals && linkedInContacts.length === 0 ? (
                <p className="text-sm font-medium text-black/55">
                  Searching & verifying LinkedIn profiles currently at{" "}
                  {job.company}…
                </p>
              ) : linkedInContacts.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {linkedInContacts.map((c, i) => (
                    <a
                      key={`${c.profileUrl}-${c.name}-${i}`}
                      href={c.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-md border-2 border-black bg-white px-2.5 py-1.5 text-sm font-bold shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-0.5"
                    >
                      <span className="inline-flex size-6 items-center justify-center rounded-sm border-2 border-black bg-[#0a66c2] text-white">
                        <LinkedInMark className="size-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block leading-tight">{c.name}</span>
                        <span className="block text-[11px] font-medium text-black/55">
                          {c.title} · Current
                        </span>
                      </span>
                    </a>
                  ))}
                </ul>
              ) : (
                <p className="text-sm font-medium text-black/55">
                  {referralError
                    ? referralError
                    : searchedEmpty
                      ? `No verified current LinkedIn profiles found for ${job.company}. Try Find again, or check the company name.`
                      : `Open this panel to search LinkedIn for people at ${job.company}.`}
                </p>
              )}
            </div>
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

      <EnhancedResumeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        job={job}
        tips={job.enhancedResumeAtsTips ?? []}
        additions={job.enhancedResumeAdditions ?? []}
        stillMissing={job.enhancedResumeStillMissing ?? []}
        markdown={job.enhancedResumeMarkdown ?? ""}
        tex={job.enhancedResumeTex ?? ""}
        enhancing={enhancing}
        onRegenerate={() => void enhanceResume(true)}
      />
    </article>
  );
}

export function JobsCarousel({
  jobs,
  emptyMessage,
  hasResume = false,
}: {
  jobs: DashboardJob[];
  emptyMessage: string;
  hasResume?: boolean;
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
      <div className="rounded-lg border-[3px] border-black bg-[#fffef8] p-8 text-center shadow-[6px_6px_0_#000]">
        <p className="font-bold text-black/60">{emptyMessage}</p>
      </div>
    );
  }

  const current = items[carouselIndex];
  const pages = carouselPages(carouselIndex, items.length);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {pages.map((item, i) => {
          if (item === "…") {
            return (
              <span
                key={`ellipsis-${i}`}
                className="px-1 text-sm font-black text-black/40"
              >
                …
              </span>
            );
          }
          const active = item === carouselIndex;
          return (
            <button
              key={item}
              type="button"
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
            hasResume={hasResume}
            onToggle={() =>
              setExpanded((e) => ({
                ...e,
                [current._id]: !e[current._id],
              }))
            }
            onUpdateStatus={updateStatus}
            onReferralsUpdate={(id, contacts) =>
              setItems((prev) =>
                prev.map((j) =>
                  j._id === id ? { ...j, referralContacts: contacts } : j
                )
              )
            }
            onJobPatch={(id, patch) =>
              setItems((prev) =>
                prev.map((j) => (j._id === id ? { ...j, ...patch } : j))
              )
            }
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
