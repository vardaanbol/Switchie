import type { UserDocument } from "@/models/User";
import {
  capResumeText,
  extractResumeTextFromBuffer,
} from "@/lib/resume/extract-text";
import { resumeFingerprint } from "@/lib/resume/fingerprint";

export type UserWithSave = UserDocument & {
  save: () => Promise<unknown>;
  set: (path: string, value: unknown) => unknown;
};

function fileNameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const last = path.split("/").pop() ?? "resume.pdf";
    return decodeURIComponent(last);
  } catch {
    return "resume.pdf";
  }
}

/**
 * Prefer cached profile.resumeText; otherwise fetch Blob resumeUrl and extract.
 * Optionally persists the extracted text back onto the user document.
 */
export async function getUserResumeText(
  user: UserWithSave,
  opts?: { persist?: boolean }
): Promise<string | null> {
  const cached = user.profile?.resumeText?.trim();
  if (cached && cached.length > 40) {
    if (opts?.persist !== false && !user.profile?.resumeFingerprint) {
      user.set("profile.resumeFingerprint", resumeFingerprint(cached));
      user.set("profile.updatedAt", new Date());
      await user.save();
    }
    return cached;
  }

  const resumeUrl = user.profile?.resumeUrl?.trim();
  if (!resumeUrl) return null;

  const res = await fetch(resumeUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to download resume (${res.status})`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") ?? undefined;
  const fileName = fileNameFromUrl(resumeUrl);

  const text = capResumeText(
    await extractResumeTextFromBuffer(buffer, {
      fileName,
      mimeType: contentType,
    })
  );

  if (!text || text.length < 40) {
    throw new Error("Could not extract enough text from your resume");
  }

  if (opts?.persist !== false) {
    user.set("profile.resumeText", text);
    user.set("profile.resumeFingerprint", resumeFingerprint(text));
    user.set("profile.updatedAt", new Date());
    await user.save();
  }

  return text;
}
