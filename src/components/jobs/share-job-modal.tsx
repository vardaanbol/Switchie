"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Search, Send, Share2, X } from "lucide-react";

type DirectoryUser = { id: string; name: string; email: string };

export function ShareJobModal({
  jobId,
  jobTitle,
  onClose,
}: {
  jobId: string;
  jobTitle: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DirectoryUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<DirectoryUser | null>(null);
  const [comment, setComment] = useState("");
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

  const trimmedQuery = query.trim();
  const canSearch = trimmedQuery.length >= 1;

  useEffect(() => {
    if (!canSearch) return;

    const controller = new AbortController();
    let cancelled = false;

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(trimmedQuery)}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (!cancelled && res.ok) {
          setResults((data.users ?? []) as DirectoryUser[]);
        }
      } catch {
        /* aborted or offline — leave prior results */
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [trimmedQuery, canSearch]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      toast.error("Pick a Yawner to share with");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/share`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toUserId: selected.id,
            comment: comment.trim() || undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.error === "string" ? data.error : "Share failed"
          );
        }
        toast.success(`Yawn shared with ${selected.name.split(" ")[0] || selected.name}`);
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Share failed");
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
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-lg border-[3px] border-black bg-[#fffef8] shadow-[8px_8px_0_#000]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b-[2.5px] border-black p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border-[2.5px] border-black bg-[#b5f2c9] shadow-[2px_2px_0_#000]">
              <Share2 className="size-4" />
            </span>
            <div className="min-w-0">
              <p
                id={titleId}
                className="text-[11px] font-black uppercase tracking-[0.18em]"
              >
                Share this yawn
              </p>
              <p className="truncate text-xs font-medium text-black/55">
                {jobTitle}
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

        <form
          onSubmit={submit}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-5"
        >
          <div>
            <label
              htmlFor={`${titleId}-search`}
              className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-black/50"
            >
              Find a Yawner by name or email
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black/35" />
              <input
                id={`${titleId}-search`}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(null);
                }}
                placeholder="vardaan or name@gmail.com"
                autoFocus
                disabled={pending}
                className="h-12 w-full rounded-md border-[3px] border-black bg-white pl-9 pr-3 text-sm font-medium text-black outline-none placeholder:font-normal placeholder:text-black/35 disabled:opacity-60"
              />
            </div>
          </div>

          {selected ? (
            <div className="flex items-center justify-between gap-3 rounded-md border-[2.5px] border-black bg-[#b5f2c9] px-3 py-2.5 shadow-[2px_2px_0_#000]">
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{selected.name}</p>
                <p className="truncate text-xs font-medium text-black/60">
                  {selected.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="shrink-0 text-[10px] font-black uppercase tracking-wider underline"
              >
                Change
              </button>
            </div>
          ) : canSearch ? (
            <div className="max-h-48 min-h-0 overflow-y-auto overscroll-contain sm:max-h-56">
              {searching ? (
                <p className="text-sm font-medium text-black/50">Searching…</p>
              ) : results.length === 0 ? (
                <p className="text-sm font-medium text-black/55">
                  No Yawner found. They need a Y.A.W.N account first.
                </p>
              ) : (
                <ul className="space-y-2">
                  {results.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(u)}
                        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md border-[2.5px] border-black bg-white px-3 py-2 text-left shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-0.5 hover:bg-[#ffe566]"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black">
                            {u.name}
                          </span>
                          <span className="block truncate text-xs font-medium text-black/55">
                            {u.email}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          <div>
            <label
              htmlFor={`${titleId}-comment`}
              className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-black/50"
            >
              Add a note (optional)
            </label>
            <textarea
              id={`${titleId}-comment`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Why this one’s worth a look…"
              disabled={pending}
              className="w-full resize-none rounded-md border-[3px] border-black bg-white px-3 py-2.5 text-sm font-medium text-black outline-none placeholder:font-normal placeholder:text-black/35 disabled:opacity-60"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-black/40">
              {comment.trim().length}/500
            </span>
            <button
              type="submit"
              disabled={pending || !selected}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border-[3px] border-black bg-[#a8e6ff] px-4 text-sm font-black shadow-[3px_3px_0_#000] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              <Send className="size-3.5" />
              {pending ? "Sharing…" : "Share"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
