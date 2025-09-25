import { Schema, model } from "mongoose";
import { IPackage } from "./package.interface";

const packageSchema = new Schema<IPackage>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    role: { type: String, enum: ["photographer", "videographer", 'both'], required: true },
    duration: { type: Number, required: true }, // in weeks
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    isDeleted: { type: Boolean, default: false },
    thumbnailImage: { type: String },
  },
  { timestamps: true }
);

export const Package = model<IPackage>("Package", packageSchema);
