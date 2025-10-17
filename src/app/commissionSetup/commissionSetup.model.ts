import { model, Schema } from "mongoose";
import { ICommissionSetup } from "./commissionSetup.interface";

const commissionSetupSchema = new Schema<ICommissionSetup>(
  {
    photoVideoGrapy: { type: Number, required: true, default: 0 },
    minimumCharge: { type: Number, required: true, default: 0 },
    gearOrders: { type: Number, required: true, default: 0 },
    workShop: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

export const CommissionSetup = model<ICommissionSetup>(
  "CommissionSetup",
  commissionSetupSchema
);
