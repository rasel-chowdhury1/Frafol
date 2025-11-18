import { Types, Document, Model } from "mongoose";

export interface IInsurance {
  userId: Types.ObjectId;
  fullName: string;
  companyName: string;
  businessType: string;
  ico: string;
  email: string;
  phoneNumber: string;
  address: string;
  estimatedValue: number;
  anyPreviousEquipment: string;
  additionalNotes?: string;
}

export type IInsuranceDocument = IInsurance & Document;

export type IInsuranceModel = Model<IInsuranceDocument>;

