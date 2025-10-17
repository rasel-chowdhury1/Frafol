import { Document, Types } from "mongoose";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface IPackage extends Document {
  authorId: Types.ObjectId;
  title: string;
  description: string;
  vatAmount?: number;
  price: number;
  mainPrice: number;
 category: "photography" | "videography";
  duration: string; 
  deliveryTime: number;
  approvalStatus: ApprovalStatus;
  isDeleted: boolean;
  thumbnailImage?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUpdatePackage {
  title?: string;
  description?: string;
  vatAmount?: number;
  price?: number;
  mainPrice?: number;
  category?: "photography" | "videography";
  duration?: string;
  deliveryTime?: number;
  approvalStatus?: ApprovalStatus;
  thumbnailImage?: string;
}
