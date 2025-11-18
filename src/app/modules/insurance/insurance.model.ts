import { Schema, model } from "mongoose";
import { IInsuranceDocument, IInsuranceModel } from "./insurance.interface";

const InsuranceSchema = new Schema<IInsuranceDocument>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },

    fullName: { 
      type: String, 
      required: true 
    },
    companyName: { 
      type: String, 
      default: "" 
    },
    businessType: { 
      type: String, 
      required: true 
    },
    ico: { 
      type: String, 
      required: true 
    },
    email: { 
      type: String, 
      required: true 
    },

    phoneNumber: { 
      type: String, 
      required: true 
    },
    address: { 
      type: String, 
      required: true 
    },

    estimatedValue: { 
      type: Number, 
      required: true 
    },
    anyPreviousEquipment: { 
      type: String, 
      required: true 
    },
    additionalNotes: { 
      type: String, 
      default: "" 
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Insurance = model<IInsuranceDocument, IInsuranceModel>(
  "Insurance",
  InsuranceSchema
);
