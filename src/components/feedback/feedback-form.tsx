"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { MessageSquare, Send, Star, X } from "lucide-react";
import { HeaderAction } from "@/components/layout/app-header";

function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="radiogroup"
      aria-label="Rating out of 5"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= shown;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            disabled={disabled}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            onClick={() => onChange(n)}
            className="inline-flex size-11 items-center justify-center rounded-md border-[2.5px] border-black bg-white shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-0.5 disabled:opacity-50 sm:size-10"
          >
            <Star
              className={`size-5 ${filled ? "fill-[#ffe566] text-black" : "text-black/25"}`}
            />
          </button>
        );
      })}
      <span className="ml-1 text-sm font-black tabular-nums text-black/55">
        {value > 0 ? `${value}/5` : "—/5"}
      </span>
    </div>
  );
}

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (rating < 1 || rating > 5) {
      toast.error("Pick a rating out of 5");
      return;
    }
    if (!trimmed) {
      toast.error("Write a quick note first");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, rating }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.error === "string" ? data.error : "Could not send"
          );
        }
        toast.success("Thanks — feedback saved");
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not send");
      }
    });
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border-[3px] border-black bg-[#fffef8] p-5 shadow-[8px_8px_0_#000] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border-[2.5px] border-black bg-[#c9b6ff] shadow-[2px_2px_0_#000]">
              <MessageSquare className="size-4" />
            </span>
            <div className="min-w-0">
              <p
                id={titleId}
                className="text-[11px] font-black uppercase tracking-[0.18em]"
              >
                Send a yawn
              </p>
              <p className="text-xs font-medium text-black/55">
                Bugs, ideas, or vibes — drop them here
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border-2 border-black bg-white shadow-[2px_2px_0_#000]"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-black/50">
              How’s Y.A.W.N? · out of 5
            </p>
            <StarRating
              value={rating}
              onChange={setRating}
              disabled={pending}
            />
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="What’s working, what’s not…"
            disabled={pending}
            autoFocus
            className="w-full resize-none rounded-md border-[3px] border-black bg-white px-3 py-2.5 text-sm font-medium text-black outline-none placeholder:font-normal placeholder:text-black/35 disabled:opacity-60"
          />

          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-black/40">
              {message.trim().length}/2000
            </span>
            <button
              type="submit"
              disabled={pending || !message.trim() || rating < 1}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border-[3px] border-black bg-[#a8e6ff] px-4 text-sm font-black shadow-[3px_3px_0_#000] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              <Send className="size-3.5" />
              {pending ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

/** Header control that opens the feedback modal. */
export function FeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <HeaderAction
        aria-label="Feedback"
        onClick={() => setOpen(true)}
        className="bg-[#c9b6ff]"
      >
        <MessageSquare className="size-3.5" />
        <span className="hidden sm:inline">Feedback</span>
      </HeaderAction>
      {open ? <FeedbackModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}
