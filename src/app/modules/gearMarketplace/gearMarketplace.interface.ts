import { Types } from "mongoose";

export type ConditionType = "new" | "used";
export type ApprovalStatus = "pending" | "approved" | "cancelled";

export interface IShippingCompany {
  name: string;
  price: number;
}

export interface IGearMarketplace {
  authorId: Types.ObjectId;
  categoryId: Types.ObjectId;
  name: string;
  price: number;
  vatAmount?: number;
  description: string;
  condition: ConditionType;
  gallery: string[];
  shippingCompany: IShippingCompany;
  extraInformation?: string;
  approvalStatus?: ApprovalStatus;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUpdateGearMarketplace {
  name?: string;
  price?: number;
  vatAmount?: number;
  description?: string;
  condition?: ConditionType;
  gallery?: string[];
  shippingCompany?: IShippingCompany[];
  extraInformation?: string;
}
