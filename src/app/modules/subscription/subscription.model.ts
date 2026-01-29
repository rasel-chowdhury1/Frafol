import { Schema, model } from "mongoose";
import { SubscriptionModel, TSubscription } from "./subscription.interface";

const subscriptionSchema = new Schema<TSubscription>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: Number,
      enum: [30, 90, 180, 365],
      required: true,
      unique: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Subscription = model<TSubscription, SubscriptionModel>(
  "Subscription",
  subscriptionSchema
);
