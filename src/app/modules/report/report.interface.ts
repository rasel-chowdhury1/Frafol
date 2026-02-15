import { Types } from "mongoose";

export interface IReport {
  userId?: Types.ObjectId;
  name: string;
  email: string;
  url: string;
  image: string;
  reason: string;
  message: string;
  agreement: boolean;
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
