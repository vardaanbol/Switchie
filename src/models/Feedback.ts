import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const FeedbackSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    userEmail: {
      type: String,
      trim: true,
    },
    userName: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

FeedbackSchema.index({ createdAt: -1 });

export type FeedbackDocument = InferSchemaType<typeof FeedbackSchema> & {
  _id: mongoose.Types.ObjectId;
};

type FeedbackModel = Model<FeedbackDocument>;

const Feedback =
  (mongoose.models.Feedback as FeedbackModel) ||
  mongoose.model<FeedbackDocument>("Feedback", FeedbackSchema);

export default Feedback;
