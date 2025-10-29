import { Schema, model } from "mongoose";
import { IWorkshop } from "./workshop.interface";

const workshopSchema = new Schema<IWorkshop>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    locationType: { type: String, enum: ["offline", "online"], required: true },
    location: { type: String },
    workshopLink: { type: String },
    vatPercent: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    price: { type: Number, required: true },
    mainPrice: {type: Number, required: true},
    description: { type: String, required: true },
    image: { type: String, required: true },
    maxParticipant: { type: Number, default: 0 },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "cancelled"],
      default: "pending",
    },
    declineReason: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Workshop = model<IWorkshop>("Workshop", workshopSchema);
