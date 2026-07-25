"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, MapPin, Plus, Upload, X } from "lucide-react";
import type { WorkMode } from "@/models/User";

export type ProfileFormValues = {
  name: string;
  salaryExpectationMin: number;
  salaryExpectationMax: number;
  workMode: WorkMode;
  preferredLocations: string[];
  rolesOfInterest: string[];
  emailDigestEnabled: boolean;
  resumeUrl?: string;
  resumeParsedSkills?: string[];
};

type ProfileFormProps = {
  initial: ProfileFormValues;
  mode: "onboarding" | "settings";
};

function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-black uppercase tracking-[0.16em] text-black"
      >
        {children}
      </label>
      {hint ? (
        <span className="text-[10px] font-bold uppercase tracking-wider text-black/40">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/** Comic neo-brutalist input — thick ink border + hard offset shadow. */
function ComicInput(props: React.ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={[
        // text-base (16px) prevents iOS Safari zoom-on-focus
        "h-12 w-full rounded-md border-[3px] border-black bg-white px-4 text-base font-medium text-black outline-none transition-transform placeholder:font-normal placeholder:text-black/35",
        "shadow-[4px_4px_0_#000] focus:-translate-y-0.5 focus:shadow-[5px_5px_0_#000]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function ComicDropdown({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <ul
      role="listbox"
      className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-40 overflow-auto rounded-md border-[3px] border-black bg-white py-1 shadow-[4px_4px_0_#000] sm:max-h-56"
    >
      {children}
    </ul>
  );
}

function TagInput({
  label,
  hint,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  function addTag() {
    const value = draft.trim();
    if (!value) return;
    if (values.includes(value)) {
      setDraft("");
      return;
    }
    onChange([...values, value]);
    setDraft("");
  }

  return (
    <div>
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <ComicInput
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
          />
        </div>
        <button
          type="button"
          onClick={addTag}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-md border-[3px] border-black bg-[#a8e6ff] px-3 text-sm font-black shadow-[4px_4px_0_#000] transition-transform hover:-translate-y-0.5 sm:px-4"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add</span>
        </button>
      </div>
      {values.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex max-w-full items-center gap-1.5 break-words rounded-md border-[2.5px] border-black bg-white py-1.5 pl-3 pr-1.5 text-sm font-bold shadow-[2px_2px_0_#000]"
            >
              {value}
              <button
                type="button"
                className="rounded-sm p-0.5 text-black/50 transition-colors hover:bg-black hover:text-white"
                onClick={() => onChange(values.filter((v) => v !== value))}
                aria-label={`Remove ${value}`}
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function LocationTagInput({
  label,
  hint,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    const q = draft.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    const id = ++requestId.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/locations/search?q=${encodeURIComponent(q)}`
        );
        const data = await res.json();
        if (id !== requestId.current) return;
        const next = (data.locations as string[] | undefined) ?? [];
        setSuggestions(next);
        setOpen(next.length > 0);
        setActiveIndex(-1);
      } catch {
        if (id !== requestId.current) return;
        setSuggestions([]);
        setOpen(false);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [draft]);

  function addLocation(raw: string) {
    const value = raw.trim();
    if (!value) return;
    if (!values.includes(value)) {
      onChange([...values, value]);
    }
    setDraft("");
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
  }

  return (
    <div ref={wrapRef}>
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <div className="relative flex gap-2">
        <div className="relative min-w-0 flex-1">
          <MapPin className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-black/40" />
          <ComicInput
            value={draft}
            placeholder={placeholder}
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            className="pl-10"
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && open) {
                e.preventDefault();
                setActiveIndex((i) =>
                  Math.min(i + 1, suggestions.length - 1)
                );
              } else if (e.key === "ArrowUp" && open) {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (open && activeIndex >= 0 && suggestions[activeIndex]) {
                  addLocation(suggestions[activeIndex]);
                } else {
                  addLocation(draft);
                }
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
          />
          <ComicDropdown open={open || (loading && draft.trim().length >= 2)}>
            {loading && suggestions.length === 0 ? (
              <li className="px-4 py-3 text-sm font-bold text-black/40">
                Searching India…
              </li>
            ) : (
              suggestions.map((item, index) => (
                <li
                  key={item}
                  role="option"
                  aria-selected={index === activeIndex}
                >
                  <button
                    type="button"
                    className={[
                      "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-bold transition-colors",
                      index === activeIndex
                        ? "bg-[#ffe566]"
                        : "hover:bg-[#a8e6ff]/50",
                    ].join(" ")}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => addLocation(item)}
                  >
                    <MapPin className="size-3.5 shrink-0 text-black/45" />
                    {item}
                  </button>
                </li>
              ))
            )}
          </ComicDropdown>
        </div>
        <button
          type="button"
          onClick={() => addLocation(draft)}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-md border-[3px] border-black bg-[#a8e6ff] px-3 text-sm font-black shadow-[4px_4px_0_#000] transition-transform hover:-translate-y-0.5 sm:px-4"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add</span>
        </button>
      </div>
      {values.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1.5 rounded-md border-[2.5px] border-black bg-white py-1.5 pl-3 pr-1.5 text-sm font-bold shadow-[2px_2px_0_#000]"
            >
              <MapPin className="size-3 text-black/40" />
              {value}
              <button
                type="button"
                className="rounded-sm p-0.5 text-black/50 transition-colors hover:bg-black hover:text-white"
                onClick={() => onChange(values.filter((v) => v !== value))}
                aria-label={`Remove ${value}`}
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProfileForm({ initial, mode }: ProfileFormProps) {
  const router = useRouter();
  const { update } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<ProfileFormValues>(initial);
  const [skills, setSkills] = useState<string[]>(
    initial.resumeParsedSkills ?? []
  );
  const [resumeUrl, setResumeUrl] = useState(initial.resumeUrl);

  const needsLocations = form.workMode === "onsite" || form.workMode === "both";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (form.rolesOfInterest.length < 1) {
      toast.error("Add at least one role of interest");
      return;
    }
    if (
      (form.workMode === "onsite" || form.workMode === "both") &&
      form.preferredLocations.length < 1
    ) {
      toast.error("Add at least one preferred location");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          salaryExpectationMin: form.salaryExpectationMin,
          salaryExpectationMax: form.salaryExpectationMax,
          workMode: form.workMode,
          preferredLocations: form.preferredLocations,
          rolesOfInterest: form.rolesOfInterest,
          emailDigestEnabled: form.emailDigestEnabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail =
          data.details?.fieldErrors &&
          Object.values(data.details.fieldErrors).flat().join(", ");
        throw new Error(detail || data.error || "Failed to save profile");
      }

      await update({ profileComplete: data.profileComplete ?? true });
      toast.success("Profile saved");

      if (mode === "onboarding") {
        window.location.assign("/dashboard");
        return;
      }

      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onResumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/resume/upload", {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Upload failed");
      }
      setResumeUrl(data.resumeUrl);
      setSkills(data.resumeParsedSkills ?? []);
      toast.success("Resume uploaded and skills extracted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-7">
      <div>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <ComicInput
          id="name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
          placeholder="Your name"
        />
      </div>

      <div>
        <FieldLabel hint="Annual · INR">Salary range</FieldLabel>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-sm font-black text-black/40">
              ₹
            </span>
            <ComicInput
              id="salaryMin"
              type="number"
              min={0}
              step={10000}
              value={form.salaryExpectationMin}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  salaryExpectationMin: Number(e.target.value),
                }))
              }
              required
              className="pl-8"
              placeholder="Min"
            />
          </div>
          <span className="hidden text-center text-lg font-black sm:block">
            —
          </span>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-sm font-black text-black/40">
              ₹
            </span>
            <ComicInput
              id="salaryMax"
              type="number"
              min={0}
              step={10000}
              value={form.salaryExpectationMax}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  salaryExpectationMax: Number(e.target.value),
                }))
              }
              required
              className="pl-8"
              placeholder="Max"
            />
          </div>
        </div>
      </div>

      <div>
        <FieldLabel>Work mode</FieldLabel>
        <div className="grid grid-cols-3 gap-2 rounded-md border-[3px] border-black bg-white p-1.5 shadow-[4px_4px_0_#000]">
          {(["onsite", "remote", "both"] as const).map((mode) => {
            const active = form.workMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setForm((f) => ({ ...f, workMode: mode }))}
                className={[
                  "rounded-sm px-3 py-2.5 text-sm font-bold capitalize transition-all",
                  active
                    ? "border-2 border-black bg-[#ffe566] shadow-[2px_2px_0_#000]"
                    : "text-black/45 hover:text-black",
                ].join(" ")}
              >
                {mode}
              </button>
            );
          })}
        </div>
      </div>

      <LocationTagInput
        label="Preferred locations"
        hint={needsLocations ? "Required" : "Optional"}
        values={form.preferredLocations}
        onChange={(preferredLocations) =>
          setForm((f) => ({ ...f, preferredLocations }))
        }
        placeholder="Start typing a city…"
      />

      <TagInput
        label="Roles of interest"
        hint="Required"
        values={form.rolesOfInterest}
        onChange={(rolesOfInterest) =>
          setForm((f) => ({ ...f, rolesOfInterest }))
        }
        placeholder="e.g. Backend Engineer"
      />

      <div>
        <FieldLabel hint="PDF / DOCX · optional">Resume</FieldLabel>
        <input
          ref={fileRef}
          id="resume"
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
          onChange={onResumeChange}
          disabled={uploading}
          className="sr-only"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-md border-[3px] border-dashed border-black bg-white px-6 py-8 text-center shadow-[4px_4px_0_#000] transition-all hover:bg-[#ffe566]/40 disabled:opacity-50"
        >
          <div className="flex size-11 items-center justify-center rounded-md border-2 border-black bg-white shadow-[2px_2px_0_#000]">
            {resumeUrl ? (
              <FileText className="size-4" />
            ) : (
              <Upload className="size-4" />
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-black">
              {uploading
                ? "Uploading…"
                : resumeUrl
                  ? "Replace resume"
                  : "Drop or choose a resume"}
            </p>
            <p className="text-xs font-medium text-black/45">
              We&apos;ll extract skills automatically
            </p>
          </div>
        </button>
        {resumeUrl && (
          <p className="mt-2 text-sm font-medium text-black/55">
            Uploaded:{" "}
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-black underline decoration-2 underline-offset-2"
            >
              view file
            </a>
          </p>
        )}
        {skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="rounded-sm border-2 border-black bg-white px-2.5 py-1 text-xs font-bold shadow-[2px_2px_0_#000]"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 rounded-md border-[3px] border-black bg-white px-4 py-4 shadow-[4px_4px_0_#000]">
        <div>
          <p className="text-sm font-black">Daily email digest</p>
          <p className="mt-0.5 text-xs font-medium text-black/45">
            Top matches every morning at 6:00 AM IST
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={form.emailDigestEnabled}
          onClick={() =>
            setForm((f) => ({
              ...f,
              emailDigestEnabled: !f.emailDigestEnabled,
            }))
          }
          className={[
            "relative h-9 w-16 shrink-0 rounded-md border-[3px] border-black transition-colors",
            form.emailDigestEnabled ? "bg-[#ffe566]" : "bg-white",
          ].join(" ")}
        >
          <span
            className={[
              "absolute top-0.5 size-5 rounded-sm border-2 border-black bg-black transition-all",
              form.emailDigestEnabled ? "left-8" : "left-0.5",
            ].join(" ")}
          />
        </button>
      </div>

      <button
        type="submit"
        disabled={saving || uploading}
        className="inline-flex h-12 w-full items-center justify-center rounded-md border-[3px] border-black bg-black px-6 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[4px_4px_0_#333] transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving
          ? "Saving…"
          : mode === "onboarding"
            ? "Finish setup"
            : "Save changes"}
      </button>
    </form>
  );
}
