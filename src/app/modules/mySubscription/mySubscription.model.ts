import { Schema, model } from 'mongoose';
import {
  TMySubscription,
  MySubscriptionModel,
} from './mySubscription.interface';

const mySubscriptionSchema = new Schema<TMySubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
    },

    howManyDays: {
      type: Number,
      required: true,
    },

    startDate: {
      type: Date,
      default: Date.now,
    },

    expireDate: {
      type: Date,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one active subscription per user
mySubscriptionSchema.index({ userId: 1, isActive: 1 });

export const MySubscription = model<
  TMySubscription,
  MySubscriptionModel
>('MySubscription', mySubscriptionSchema);
