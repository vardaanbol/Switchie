"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

const STEPS = [
  "Stretching… then hunting roles",
  "Whispering your skills into Adzuna",
  "Asking Gemini what fits your nap schedule",
  "Sorting keepers from meh listings",
  "Sniffing out salaries (quietly)",
  "Drawing little match scores in the margin",
  "Looking for humans who might refer you",
  "Tossing duplicate postings in the recycling bin",
  "Polishing pros & cons so they don’t lie",
  "Checking if remote means remote-remote",
  "Counting years of experience (not naps)",
  "Inking today’s issue of the job comic",
  "Almost done — don’t wake up yet",
  "One more scroll through the classifieds…",
  "Teaching the agent your preferred cities",
  "Yawning professionally on your behalf",
];

function pickNext(current: number) {
  if (STEPS.length <= 1) return 0;
  let next = current;
  while (next === current) {
    next = Math.floor(Math.random() * STEPS.length);
  }
  return next;
}

export function RefreshStepLoader({ active }: { active: boolean }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    setStepIndex(Math.floor(Math.random() * STEPS.length));

    const id = window.setInterval(() => {
      setStepIndex((i) => pickNext(i));
    }, 2200);

    return () => window.clearInterval(id);
  }, [active]);

  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 sm:items-center sm:p-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Searching for jobs"
    >
      <div className="animate-yawn-pop w-full max-w-md rounded-lg border-[3px] border-black bg-[#fffef8] p-5 shadow-[8px_8px_0_#000] sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="inline-flex size-11 items-center justify-center rounded-md border-[3px] border-black bg-[#ffe566] shadow-[3px_3px_0_#000]">
            <RefreshCw className="size-5 animate-spin" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
              Refresh in progress
            </p>
            <p className="text-lg font-black tracking-tight sm:text-xl">
              Hunting while you wait
            </p>
          </div>
        </div>

        <div
          key={stepIndex}
          className="animate-yawn-step min-h-[3.25rem] rounded-md border-[2.5px] border-black bg-white px-3 py-3 text-[15px] font-bold leading-snug shadow-[3px_3px_0_#000]"
        >
          {STEPS[stepIndex]}
        </div>

        <div className="mt-4 flex gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="animate-yawn-bar h-2.5 flex-1 rounded-sm border-2 border-black bg-[#a8e6ff]"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </div>

        <p className="mt-3 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-black/40">
          Usually under a minute — feel free to nap
        </p>
      </div>
    </div>
  );
}
