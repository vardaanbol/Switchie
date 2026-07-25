import { createHash } from "crypto";

/**
 * Stable id for a resume version. Cached AI output (match scores, generated
 * .tex) is reused only while the fingerprint matches, so uploading a new
 * resume invalidates it automatically.
 */
export function resumeFingerprint(text: string): string {
  return createHash("sha256")
    .update(text.replace(/\s+/g, " ").trim())
    .digest("hex")
    .slice(0, 32);
}
