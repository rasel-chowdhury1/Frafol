import { Document, Types } from "mongoose";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface IPackage extends Document {
  authorId: Types.ObjectId;
  title: string;
  description: string;
  vatAmount?: number;
  price: number;
 category: "photography" | "videography";
  duration: number; // in days
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
    category?: "photography" | "videography";
  duration?: number;
  approvalStatus?: ApprovalStatus;
  thumbnailImage?: string;
}
