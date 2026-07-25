import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const WORK_MODES = ["onsite", "remote", "both"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const EMPLOYMENT_TYPES = [
  "full-time",
  "permanent",
  "contract",
  "part-time",
  "internship",
  "freelance",
  "other",
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

const ResumeRoleSchema = new Schema(
  {
    company: { type: String, default: "" },
    title: { type: String, default: "" },
    dates: { type: String, default: "" },
    months: { type: Number, min: 0, default: 0 },
    employmentType: {
      type: String,
      enum: EMPLOYMENT_TYPES,
      default: "other",
    },
  },
  { _id: false }
);

const UserProfileSchema = new Schema(
  {
    salaryExpectationMin: { type: Number, min: 0 },
    salaryExpectationMax: { type: Number, min: 0 },
    workMode: {
      type: String,
      enum: WORK_MODES,
    },
    preferredLocations: {
      type: [String],
      default: [],
    },
    rolesOfInterest: {
      type: [String],
      default: [],
    },
    resumeUrl: { type: String },
    resumeText: { type: String },
    /** Hash of resumeText — cached AI output is only reused while this matches. */
    resumeFingerprint: { type: String },
    resumeParsedSkills: {
      type: [String],
      default: [],
    },
    /** Full-time / permanent experience only (internships excluded). */
    resumeExperienceMonths: { type: Number, min: 0 },
    resumeExperienceYears: { type: Number, min: 0 },
    resumeInternshipMonths: { type: Number, min: 0 },
    resumeExperienceRoles: {
      type: [ResumeRoleSchema],
      default: [],
    },
    resumeExperienceAt: { type: Date },
    emailDigestEnabled: {
      type: Boolean,
      default: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    googleId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: { type: String },
    profile: {
      type: UserProfileSchema,
      default: () => ({
        preferredLocations: [],
        rolesOfInterest: [],
        resumeParsedSkills: [],
        emailDigestEnabled: true,
        updatedAt: new Date(),
      }),
    },
  },
  {
    timestamps: true,
  }
);

export type ResumeRole = InferSchemaType<typeof ResumeRoleSchema>;
export type UserProfile = InferSchemaType<typeof UserProfileSchema>;
export type UserDocument = InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type UserModel = Model<UserDocument>;

const User =
  (mongoose.models.User as UserModel) ||
  mongoose.model<UserDocument>("User", UserSchema);

export default User;
