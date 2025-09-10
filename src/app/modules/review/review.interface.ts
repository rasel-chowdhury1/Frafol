import { Types } from "mongoose";

export interface IReview {
  userId: Types.ObjectId;
  serviceProviderId: Types.ObjectId;
  rating: number;
  message: string;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUpdateReview {
  rating?: number;
  message?: string;
}
