import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const EnhanceEventSchema = new Schema(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "JobListing",
      required: true,
    },
    at: {
      type: Date,
      required: true,
    },
  },
  { _id: false }
);

const EnhanceRateLimitSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    events: {
      type: [EnhanceEventSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export type EnhanceRateLimitDocument = InferSchemaType<
  typeof EnhanceRateLimitSchema
> & { _id: mongoose.Types.ObjectId };

type EnhanceRateLimitModel = Model<EnhanceRateLimitDocument>;

const EnhanceRateLimit =
  (mongoose.models.EnhanceRateLimit as EnhanceRateLimitModel) ||
  mongoose.model<EnhanceRateLimitDocument>(
    "EnhanceRateLimit",
    EnhanceRateLimitSchema
  );

export default EnhanceRateLimit;

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_ENHANCES_PER_WEEK = 2;

function recentEvents(
  events: { jobId: mongoose.Types.ObjectId; at: Date }[]
) {
  const cutoff = Date.now() - ONE_WEEK_MS;
  return events.filter((e) => e.at.getTime() >= cutoff);
}

function retryAfterFrom(events: { at: Date }[]) {
  if (events.length === 0) return 0;
  const oldest = Math.min(...events.map((e) => e.at.getTime()));
  return Math.max(1, Math.ceil((oldest + ONE_WEEK_MS - Date.now()) / 1000));
}

export async function assertEnhanceAllowed(
  userId: mongoose.Types.ObjectId
) {
  const existing = await EnhanceRateLimit.findOne({ userId });
  const recent = recentEvents(existing?.events ?? []);

  if (recent.length >= MAX_ENHANCES_PER_WEEK) {
    return {
      allowed: false as const,
      retryAfterSeconds: retryAfterFrom(recent),
      used: recent.length,
    };
  }

  return { allowed: true as const, used: recent.length };
}

export async function markEnhance(
  userId: mongoose.Types.ObjectId,
  jobId: mongoose.Types.ObjectId
) {
  const existing = await EnhanceRateLimit.findOne({ userId });
  const pruned = recentEvents(existing?.events ?? []);
  pruned.push({ jobId, at: new Date() });

  await EnhanceRateLimit.findOneAndUpdate(
    { userId },
    { $set: { events: pruned } },
    { upsert: true }
  );
}
