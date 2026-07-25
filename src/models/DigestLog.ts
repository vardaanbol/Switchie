import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const EMAIL_STATUSES = ["pending", "sent", "failed", "skipped"] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

const DigestLogSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    jobIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "JobListing" }],
      default: [],
    },
    emailStatus: {
      type: String,
      enum: EMAIL_STATUSES,
      default: "pending",
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

DigestLogSchema.index({ userId: 1, sentAt: -1 });

export type DigestLogDocument = InferSchemaType<typeof DigestLogSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type DigestLogModel = Model<DigestLogDocument>;

const DigestLog =
  (mongoose.models.DigestLog as DigestLogModel) ||
  mongoose.model<DigestLogDocument>("DigestLog", DigestLogSchema);

export default DigestLog;
