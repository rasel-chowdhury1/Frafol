import { Schema, model } from "mongoose";
import { ICategory } from "./category.interface";

const categorySchema = new Schema<ICategory>(
  {
    order: { type: Number, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    subTitle: { type: String,default: "" },
    image: { type: String,default: "" },
    type: { type: String, enum: ["photoGraphy", "videoGraphy", "gear"], required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Category = model<ICategory>("Category", categorySchema);
