import { Schema, model } from "mongoose";
import { IPackage } from "./package.interface";

const packageSchema = new Schema<IPackage>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    vatAmount: { type: Number, default: 0 },
    price: { type: Number, required: true },
    mainPrice: {type: Number, required: true},
    category: { type: String, enum: ["photography", "videography"], required: true },
    duration: { type: String, required: true }, 
    deliveryTime: { type: Number, required: true }, // in days
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    isDeleted: { type: Boolean, default: false },
    thumbnailImage: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Package = model<IPackage>("Package", packageSchema);
