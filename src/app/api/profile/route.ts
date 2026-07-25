import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { profileSchema } from "@/lib/validators/profile";
import { isProfileComplete } from "@/lib/profile";

export async function GET() {
  const result = await requireUser();
  if ("error" in result) return result.error;

  const { user } = result;
  return NextResponse.json({
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    image: user.image,
    profile: user.profile,
  });
}

export async function PATCH(req: Request) {
  const result = await requireUser();
  if ("error" in result) return result.error;

  const { user } = result;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  if (data.name) {
    user.name = data.name;
  }

  const existing = {
    preferredLocations: user.profile?.preferredLocations ?? [],
    rolesOfInterest: user.profile?.rolesOfInterest ?? [],
    resumeParsedSkills: user.profile?.resumeParsedSkills ?? [],
    emailDigestEnabled: user.profile?.emailDigestEnabled ?? true,
    resumeUrl: user.profile?.resumeUrl ?? undefined,
    salaryExpectationMin: user.profile?.salaryExpectationMin ?? undefined,
    salaryExpectationMax: user.profile?.salaryExpectationMax ?? undefined,
    workMode: user.profile?.workMode ?? undefined,
  };

  // Resume-derived data is expensive to rebuild, so carry it across the
  // subdocument replacement below.
  const resumeCache = {
    resumeText: user.profile?.resumeText ?? undefined,
    resumeFingerprint: user.profile?.resumeFingerprint ?? undefined,
    resumeExperienceMonths: user.profile?.resumeExperienceMonths ?? undefined,
    resumeExperienceYears: user.profile?.resumeExperienceYears ?? undefined,
    resumeInternshipMonths: user.profile?.resumeInternshipMonths ?? undefined,
    resumeExperienceRoles: (user.profile?.resumeExperienceRoles ?? []).map(
      (role) => ({
        company: role.company,
        title: role.title,
        dates: role.dates,
        months: role.months,
        employmentType: role.employmentType,
      })
    ),
    resumeExperienceAt: user.profile?.resumeExperienceAt ?? undefined,
  };

  user.set("profile", {
    ...existing,
    ...resumeCache,
    salaryExpectationMin: data.salaryExpectationMin,
    salaryExpectationMax: data.salaryExpectationMax,
    workMode: data.workMode,
    preferredLocations: data.preferredLocations,
    rolesOfInterest: data.rolesOfInterest,
    emailDigestEnabled:
      data.emailDigestEnabled ?? existing.emailDigestEnabled ?? true,
    resumeUrl: existing.resumeUrl,
    resumeParsedSkills: existing.resumeParsedSkills,
    updatedAt: new Date(),
  });
  user.markModified("profile");

  await user.save();

  return NextResponse.json({
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    image: user.image,
    profile: user.profile,
    profileComplete: isProfileComplete(user.profile),
  });
}

export async function POST(req: Request) {
  return PATCH(req);
}
