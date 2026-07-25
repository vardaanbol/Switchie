import {
  extractResumeExperience,
  type ResumeRoleSpan,
} from "@/lib/agent/extract-resume-experience";
import { resumeFingerprint } from "@/lib/resume/fingerprint";
import {
  getUserResumeText,
  type UserWithSave,
} from "@/lib/resume/get-user-resume-text";

export type UserResumeProfile = {
  text: string;
  /** Identifies this resume version so cached AI output can be reused. */
  fingerprint: string;
  /** Full-time / permanent only; null when we couldn't read it. */
  experienceYears: number | null;
  experienceMonths: number | null;
  internshipMonths: number | null;
  roles: ResumeRoleSpan[];
};

/**
 * Resume text plus the full-time experience read off that resume. Experience is
 * parsed once per resume version and cached on the user profile, so repeat
 * scoring never re-runs the extraction.
 */
export async function getUserResumeProfile(
  user: UserWithSave
): Promise<UserResumeProfile | null> {
  const text = await getUserResumeText(user);
  if (!text) return null;

  const fingerprint = resumeFingerprint(text);
  const profile = user.profile;

  if (
    profile?.resumeFingerprint === fingerprint &&
    typeof profile?.resumeExperienceYears === "number"
  ) {
    return {
      text,
      fingerprint,
      experienceYears: profile.resumeExperienceYears,
      experienceMonths: profile.resumeExperienceMonths ?? null,
      internshipMonths: profile.resumeInternshipMonths ?? null,
      roles: (profile.resumeExperienceRoles ?? []) as ResumeRoleSpan[],
    };
  }

  try {
    const experience = await extractResumeExperience(text);

    user.set("profile.resumeFingerprint", fingerprint);
    user.set("profile.resumeExperienceMonths", experience.fullTimeMonths);
    user.set("profile.resumeExperienceYears", experience.fullTimeYears);
    user.set("profile.resumeInternshipMonths", experience.internshipMonths);
    user.set("profile.resumeExperienceRoles", experience.roles);
    user.set("profile.resumeExperienceAt", new Date());
    user.set("profile.updatedAt", new Date());
    await user.save();

    return {
      text,
      fingerprint,
      experienceYears: experience.fullTimeYears,
      experienceMonths: experience.fullTimeMonths,
      internshipMonths: experience.internshipMonths,
      roles: experience.roles,
    };
  } catch (err) {
    console.warn("[resume] experience extraction failed", err);
    return {
      text,
      fingerprint,
      experienceYears: null,
      experienceMonths: null,
      internshipMonths: null,
      roles: [],
    };
  }
}
