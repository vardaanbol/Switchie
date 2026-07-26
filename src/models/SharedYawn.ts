import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { WORK_MODES } from "./User";

export const SHARED_YAWN_STATUSES = ["new", "saved", "dismissed"] as const;
export type SharedYawnStatus = (typeof SHARED_YAWN_STATUSES)[number];

const SharedReferralContactSchema = new Schema(
  {
    name: { type: String, required: true },
    title: { type: String, required: true },
    company: { type: String, required: true },
    profileUrl: { type: String, required: true },
    confidence: { type: Number, min: 0, max: 1, default: 0.5 },
  },
  { _id: false }
);

/**
 * A job one Yawner passed to another. Listing fields are snapshotted so the
 * share survives the sender dismissing or re-running their own feed.
 */
const SharedYawnSchema = new Schema(
  {
    fromUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    toUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fromJobId: {
      type: Schema.Types.ObjectId,
      ref: "JobListing",
      required: true,
    },
    fromUserName: {
      type: String,
      trim: true,
    },
    fromUserEmail: {
      type: String,
      trim: true,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    sourceUrl: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      default: "",
    },
    workMode: {
      type: String,
      enum: WORK_MODES,
    },
    salaryEstimateMin: {
      type: Number,
      min: 0,
    },
    salaryEstimateMax: {
      type: Number,
      min: 0,
    },
    salaryIsEstimate: {
      type: Boolean,
      default: true,
    },
    pros: {
      type: [String],
      default: [],
    },
    cons: {
      type: [String],
      default: [],
    },
    referralContacts: {
      type: [SharedReferralContactSchema],
      default: [],
    },
    requiredExperienceYears: {
      type: Number,
      min: 0,
    },
    matchScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    status: {
      type: String,
      enum: SHARED_YAWN_STATUSES,
      default: "new",
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// One share of a given URL per sender/recipient pair.
SharedYawnSchema.index(
  { toUserId: 1, fromUserId: 1, sourceUrl: 1 },
  { unique: true }
);
SharedYawnSchema.index({ toUserId: 1, createdAt: -1 });

export type SharedYawnDocument = InferSchemaType<typeof SharedYawnSchema> & {
  _id: mongoose.Types.ObjectId;
};

type SharedYawnModel = Model<SharedYawnDocument>;

const SharedYawn =
  (mongoose.models.SharedYawn as SharedYawnModel) ||
  mongoose.model<SharedYawnDocument>("SharedYawn", SharedYawnSchema);

export default SharedYawn;
