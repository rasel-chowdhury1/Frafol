import { Schema, model } from "mongoose";
import { IReport } from "./report.interface";

const reportSchema = new Schema<IReport>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    url: { type: String, required: false, default: "" },
    image: { type: String, required: false, default: "" },
    reason: { type: String, required: true },
    message: { type: String, required: true },
    agreement: { type: Boolean, required: true },
    isCompleted: { type: Boolean, default: false },
    isNotified: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Report = model<IReport>("Report", reportSchema);
