import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { WORK_MODES } from "./User";

export const JOB_STATUSES = [
  "new",
  "viewed",
  "saved",
  "dismissed",
  "applied",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

const ReferralContactSchema = new Schema(
  {
    name: { type: String, required: true },
    title: { type: String, required: true },
    company: { type: String, required: true },
    profileUrl: { type: String, required: true },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5,
    },
  },
  { _id: false }
);

const JobListingSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
      type: [ReferralContactSchema],
      default: [],
    },
    matchScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
      index: true,
    },
    foundAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: JOB_STATUSES,
      default: "new",
      index: true,
    },
    savedAt: {
      type: Date,
    },
    appliedAt: {
      type: Date,
    },
    resumeMatchScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    resumeMatchGaps: {
      type: [String],
      default: [],
    },
    resumeMatchStrengths: {
      type: [String],
      default: [],
    },
    resumeMatchKeywordHits: {
      type: [String],
      default: [],
    },
    /** Full-time years read off the resume at scoring time. */
    resumeMatchExperienceYears: { type: Number, min: 0 },
    /** Years the JD asks for, as understood by the model. */
    resumeMatchRequiredYears: { type: Number, min: 0 },
    /** Years required by the JD, set at enrich time for feed filtering. */
    requiredExperienceYears: { type: Number, min: 0 },
    resumeMatchExperienceVerdict: {
      type: String,
      enum: ["meets", "exceeds", "below", "unclear"],
    },
    resumeMatchAt: { type: Date },
    /** Resume version (hash) the cached score was computed from. */
    resumeMatchFingerprint: { type: String },
    enhancedResumeTex: {
      type: String,
    },
    enhancedResumeMarkdown: {
      type: String,
    },
    enhancedResumeAtsTips: {
      type: [String],
      default: [],
    },
    enhancedResumeAdditions: {
      type: [String],
      default: [],
    },
    enhancedResumeStillMissing: {
      type: [String],
      default: [],
    },
    enhancedResumeAt: {
      type: Date,
    },
    /** Resume version (hash) the stored .tex was generated from. */
    enhancedResumeFingerprint: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Unique listing per user by source URL (dedupe on ingest)
JobListingSchema.index({ userId: 1, sourceUrl: 1 }, { unique: true });

export type ReferralContact = InferSchemaType<typeof ReferralContactSchema>;
export type JobListingDocument = InferSchemaType<typeof JobListingSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type JobListingModel = Model<JobListingDocument>;

const JobListing =
  (mongoose.models.JobListing as JobListingModel) ||
  mongoose.model<JobListingDocument>("JobListing", JobListingSchema);

export default JobListing;
