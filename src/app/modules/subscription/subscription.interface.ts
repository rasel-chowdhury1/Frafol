import { Model } from "mongoose";

export type TSubscriptionDuration = 30 | 90 | 180 | 365;

export interface TSubscription {
  title: string;
  duration: TSubscriptionDuration; // days
  price: number;
  isActive: boolean;
}

export interface SubscriptionModel extends Model<TSubscription> {}
