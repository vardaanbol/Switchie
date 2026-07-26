import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import User from "@/models/User";

const MIN_QUERY = 1;
const LIMIT = 8;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Directory lookup for sharing jobs — name or email, existing users only. */
export async function GET(req: Request) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { user } = result;

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < MIN_QUERY) {
    return NextResponse.json({ users: [] });
  }

  const pattern = new RegExp(escapeRegex(q), "i");
  const matches = await User.find({
    _id: { $ne: user._id },
    $or: [{ name: pattern }, { email: pattern }],
  })
    .select("name email profile.rolesOfInterest")
    .limit(LIMIT * 2)
    .lean();

  // Surface people who actually finished onboarding first.
  const ranked = matches
    .map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      hasProfile: (u.profile?.rolesOfInterest?.length ?? 0) > 0,
    }))
    .sort((a, b) => Number(b.hasProfile) - Number(a.hasProfile))
    .slice(0, LIMIT)
    .map(({ id, name, email }) => ({ id, name, email }));

  return NextResponse.json({ users: ranked });
}
