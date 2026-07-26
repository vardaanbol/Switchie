import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import Feedback from "@/models/Feedback";

const MAX_MESSAGE = 2000;

function parseBody(body: unknown): { message: string; rating: number | null } {
  if (typeof body !== "object" || body === null) {
    return { message: "", rating: null };
  }
  const record = body as Record<string, unknown>;
  const message =
    typeof record.message === "string" ? record.message.trim() : "";
  const rawRating = record.rating;
  const rating =
    typeof rawRating === "number"
      ? rawRating
      : typeof rawRating === "string" && rawRating.trim() !== ""
        ? Number(rawRating)
        : null;
  return { message, rating: Number.isFinite(rating) ? rating : null };
}

export async function POST(req: Request) {
  const result = await requireUser();
  if ("error" in result) return result.error;
  const { session, user } = result;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { message, rating } = parseBody(body);

  if (!message) {
    return NextResponse.json(
      { error: "Message is required" },
      { status: 400 }
    );
  }
  if (message.length > MAX_MESSAGE) {
    return NextResponse.json(
      { error: `Message must be at most ${MAX_MESSAGE} characters` },
      { status: 400 }
    );
  }
  if (
    rating === null ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return NextResponse.json(
      { error: "Rating must be an integer from 1 to 5" },
      { status: 400 }
    );
  }

  await Feedback.create({
    userId: user._id,
    message,
    rating,
    userEmail: session.user?.email ?? user.email ?? undefined,
    userName: session.user?.name ?? user.name ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
