import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const RefreshRateLimitSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    lastRefreshAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

export type RefreshRateLimitDocument = InferSchemaType<
  typeof RefreshRateLimitSchema
> & { _id: mongoose.Types.ObjectId };

type RefreshRateLimitModel = Model<RefreshRateLimitDocument>;

const RefreshRateLimit =
  (mongoose.models.RefreshRateLimit as RefreshRateLimitModel) ||
  mongoose.model<RefreshRateLimitDocument>(
    "RefreshRateLimit",
    RefreshRateLimitSchema
  );

export default RefreshRateLimit;

const ONE_HOUR_MS = 60 * 60 * 1000;

export async function assertRefreshAllowed(userId: mongoose.Types.ObjectId) {
  const existing = await RefreshRateLimit.findOne({ userId });
  if (existing) {
    const elapsed = Date.now() - existing.lastRefreshAt.getTime();
    if (elapsed < ONE_HOUR_MS) {
      const retryAfterSeconds = Math.ceil((ONE_HOUR_MS - elapsed) / 1000);
      return { allowed: false as const, retryAfterSeconds };
    }
  }
  return { allowed: true as const };
}

export async function markRefresh(userId: mongoose.Types.ObjectId) {
  await RefreshRateLimit.findOneAndUpdate(
    { userId },
    { $set: { lastRefreshAt: new Date() } },
    { upsert: true }
  );
}
