import { Model, Types } from "mongoose";

export interface ISubscribe {
  email: string;
  isVerified?: boolean;
  verificationToken?: any;
  subscribedAt?: Date;
}

export interface ISubscribeModel extends Model<ISubscribe> {}