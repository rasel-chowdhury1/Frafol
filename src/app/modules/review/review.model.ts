import { Schema, model } from "mongoose";
import { IReview } from "./review.interface";

const reviewSchema = new Schema<IReview>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    serviceProviderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    message: { type: String, required: true },
    isDeleted: { type: Boolean, required: false },
  },
  { timestamps: true }
);

export const Review = model<IReview>("Review", reviewSchema);
