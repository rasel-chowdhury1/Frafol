import { Schema, model } from "mongoose";
import { IPayment, IPaymentModel } from "./payment.interface";

const PaymentSchema = new Schema<IPayment>(
  {
    transactionId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    serviceProviderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    commission: { type: Number, required: true },
    netAmount: { type: Number, required: true },

    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "refound"],
      default: "pending",
    },

    paymentMethod: {
      type: String,
      enum: ["stripe", "card", "bank"],
      required: true,
    },

    paymentType: {
      type: String,
      enum: ["event", "gear", "workshop"],
      required: true,
    },

    eventOrderId: { type: Schema.Types.ObjectId, ref: "EventOrder" },
    gearOrderId: { type: Schema.Types.ObjectId, ref: "GearOrder" },
    workshopId: { type: Schema.Types.ObjectId, ref: "Workshop" },
  },
  { timestamps: true, versionKey: false }
);

export const Payment = model<IPayment, IPaymentModel>("Payment", PaymentSchema);
