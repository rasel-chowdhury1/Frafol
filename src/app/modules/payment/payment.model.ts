import { Schema, model } from "mongoose";
import { IPayment, IPaymentModel, IServiceProviderBreakdown } from "./payment.interface";

// Schema for Gear service provider breakdown
const ServiceProviderBreakdownSchema = new Schema<IServiceProviderBreakdown>(
  {
    serviceProviderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    commission: { type: Number, required: true },
    netAmount: { type: Number, required: true },
    serviceProviderPaid: { type: Boolean, default: false },
    serviceProviderPaidAt: { type: Date },
  },
  { _id: false }
);

const PaymentSchema = new Schema<IPayment>(
  {
    transactionId: { 
      type: String, 
      required: true, unique: true 
    },
    userId: { 
      type: Schema.Types.ObjectId, ref: "User", 
      required: true 
    },
    // For event/workshop: single service provider
    serviceProviderId: { 
      type: Schema.Types.ObjectId, ref: "User", 
      required: false 
    },

    // For gear: multiple sellers
    serviceProviders: {

      type: [ServiceProviderBreakdownSchema], 
      default: [] 
    },
    mainOrderIdForGear: { 
      type: String
    },
    amount: { 
      type: Number, 
      required: true 
    },
    commission: {
      type: Number, 
      required: true 
    },
    netAmount: { 
      type: Number, 
      required: true 
    },

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
      enum: ["event", "gear", "workshop", "subscription"],
      required: true,
    },
    
    subscriptionDays: { type: Number, required: false },

    eventOrderId: { type: Schema.Types.ObjectId, ref: "EventOrder" },
    gearOrderIds: [{ type: Schema.Types.ObjectId, ref: "GearOrder" }],
    workshopId: { type: Schema.Types.ObjectId, ref: "Workshop" },

    serviceProviderPaid: { type: Boolean, default: false },
    serviceProviderPaidAt: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

export const Payment = model<IPayment, IPaymentModel>("Payment", PaymentSchema);
