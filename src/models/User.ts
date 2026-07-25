import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const WORK_MODES = ["onsite", "remote", "both"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

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
    resumeParsedSkills: {
      type: [String],
      default: [],
    },
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

export type UserProfile = InferSchemaType<typeof UserProfileSchema>;
export type UserDocument = InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type UserModel = Model<UserDocument>;

const User =
  (mongoose.models.User as UserModel) ||
  mongoose.model<UserDocument>("User", UserSchema);

export default User;
