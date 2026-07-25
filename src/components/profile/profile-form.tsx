"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
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

function TagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
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
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
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
        <Button type="button" variant="outline" onClick={addTag}>
          Add
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <Badge key={value} variant="secondary" className="gap-1 pr-1">
              {value}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-muted"
                onClick={() => onChange(values.filter((v) => v !== value))}
                aria-label={`Remove ${value}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProfileForm({ initial, mode }: ProfileFormProps) {
  const router = useRouter();
  const { update } = useSession();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<ProfileFormValues>(initial);
  const [skills, setSkills] = useState<string[]>(initial.resumeParsedSkills ?? []);
  const [resumeUrl, setResumeUrl] = useState(initial.resumeUrl);

  const needsLocations = form.workMode === "onsite" || form.workMode === "both";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
        throw new Error(data.error ?? "Failed to save profile");
      }
      await update();
      toast.success("Profile saved");
      if (mode === "onboarding") {
        router.push("/dashboard");
        router.refresh();
      } else {
        router.refresh();
      }
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
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="salaryMin">Salary min (₹ / year)</Label>
          <Input
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
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salaryMax">Salary max (₹ / year)</Label>
          <Input
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
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Work mode</Label>
        <RadioGroup
          value={form.workMode}
          onValueChange={(value) =>
            setForm((f) => ({ ...f, workMode: value as WorkMode }))
          }
          className="flex flex-wrap gap-4"
        >
          {(["onsite", "remote", "both"] as const).map((mode) => (
            <label key={mode} className="flex items-center gap-2 text-sm capitalize">
              <RadioGroupItem value={mode} id={`mode-${mode}`} />
              {mode}
            </label>
          ))}
        </RadioGroup>
      </div>

      <TagInput
        label={needsLocations ? "Preferred locations *" : "Preferred locations"}
        values={form.preferredLocations}
        onChange={(preferredLocations) =>
          setForm((f) => ({ ...f, preferredLocations }))
        }
        placeholder="e.g. Bengaluru"
      />

      <TagInput
        label="Roles of interest *"
        values={form.rolesOfInterest}
        onChange={(rolesOfInterest) =>
          setForm((f) => ({ ...f, rolesOfInterest }))
        }
        placeholder="e.g. Backend Engineer"
      />

      <div className="space-y-2">
        <Label htmlFor="resume">Resume (PDF/DOCX, optional)</Label>
        <Input
          id="resume"
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
          onChange={onResumeChange}
          disabled={uploading}
        />
        {resumeUrl && (
          <p className="text-sm text-muted-foreground">
            Uploaded:{" "}
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              view file
            </a>
          </p>
        )}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {skills.map((skill) => (
              <Badge key={skill} variant="outline">
                {skill}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={form.emailDigestEnabled}
          onCheckedChange={(checked) =>
            setForm((f) => ({ ...f, emailDigestEnabled: checked === true }))
          }
        />
        Email me a daily job digest
      </label>

      <Button type="submit" size="lg" disabled={saving || uploading}>
        {saving ? "Saving…" : mode === "onboarding" ? "Finish setup" : "Save changes"}
      </Button>
    </form>
  );
}
