import { Model, Types } from 'mongoose';

export type TMySubscription = {
  userId: Types.ObjectId;
  paymentId: Types.ObjectId;
  howManyDays: number;
  startDate: Date;
  expireDate: Date;
  isActive: boolean;
};

export type MySubscriptionModel = Model<TMySubscription>;
