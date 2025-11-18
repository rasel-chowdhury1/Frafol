import { Schema, model } from "mongoose";
import { ISubscribe, ISubscribeModel } from "./subscribe.interface";

const SubscribeSchema = new Schema<ISubscribe>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },

    isVerified: {
      type: Boolean,
      default: false
    },

    verificationToken: {
      type: String,
      default: null
    },

    subscribedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

export const Subscribe = model<ISubscribe, ISubscribeModel>(
  "Subscribe",
  SubscribeSchema
);
