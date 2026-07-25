import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { profileSchema } from "@/lib/validators/profile";

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

  user.profile = {
    ...user.profile,
    salaryExpectationMin: data.salaryExpectationMin,
    salaryExpectationMax: data.salaryExpectationMax,
    workMode: data.workMode,
    preferredLocations: data.preferredLocations,
    rolesOfInterest: data.rolesOfInterest,
    emailDigestEnabled:
      data.emailDigestEnabled ?? user.profile?.emailDigestEnabled ?? true,
    resumeUrl: user.profile?.resumeUrl,
    resumeParsedSkills: user.profile?.resumeParsedSkills ?? [],
    updatedAt: new Date(),
  };

  await user.save();

  return NextResponse.json({
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    image: user.image,
    profile: user.profile,
  });
}

export async function POST(req: Request) {
  return PATCH(req);
}
