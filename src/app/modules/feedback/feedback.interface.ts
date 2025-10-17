import { Types } from "mongoose";

export interface IFeedback {
  userId: Types.ObjectId;
  text: string;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUpdateFeedback {
  text?: string;
}
