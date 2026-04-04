import { Model, Types } from "mongoose";

export interface ICommunity {
  authorId: Types.ObjectId;
  title: string;
  text: string;
  images?: string[];
  isDeleted?: boolean;
  deleteReason?: string;
  rejectReason?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
}

export interface ICommunityModel extends Model<ICommunity> {}
