import { Types } from "mongoose";

export interface IReport {
  userId: Types.ObjectId;
  reason: string;
  isCompleted?: boolean;
  isNotified?: boolean;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUpdateReport {
  reason?: string;
  isCompleted?: boolean;
  isNotified?: boolean;
}
