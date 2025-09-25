import { Schema, model } from "mongoose";
import { IGearMarketplace } from "./gearMarketplace.interface";

const shippingCompanySchema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const gearMarketplaceSchema = new Schema<IGearMarketplace>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    vatAmount: { type: Number, default: 0 },
    description: { type: String, required: true },
    condition: { type: String, enum: ["new", "used"], required: true },
    gallery: { type: [String], default: [] },
    shippingCompany: { type: shippingCompanySchema, default: {} },
    extraInformation: { type: String, default: "" },
    approvalStatus: { type: String, enum: ["pending", "approved", "cancelled"], default: "pending" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const GearMarketplace = model<IGearMarketplace>("GearMarketplace", gearMarketplaceSchema);
