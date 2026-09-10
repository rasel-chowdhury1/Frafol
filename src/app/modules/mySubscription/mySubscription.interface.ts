import { Model, Types } from 'mongoose';

export type CancelSource = 'user' | 'admin' | 'expired';

export type TMySubscription = {
  userId: Types.ObjectId;
  paymentId: Types.ObjectId;
  howManyDays: number;
  startDate: Date;
  expireDate: Date;
  isActive: boolean;
  cancelSource?: CancelSource;
  cancelledBy?: Types.ObjectId;
  cancelledAt?: Date;
  cancelReason?: string;
};

export type MySubscriptionModel = Model<TMySubscription>;
