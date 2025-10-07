import { Schema, model } from "mongoose";
import { IEventOrder, IEventOrderModel, OrderStatus } from "./eventOrder.interface";

const ExtensionRequestSchema = new Schema(
  {
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    newDeliveryDate: { type: Date, required: true },
    reason: { type: String, required: true },
    approved: { type: Boolean, default: false },
  },
  { _id: true }
);

const EventOrderSchema = new Schema<IEventOrder>(
  {
    orderId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    userId: { 
        type: Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    serviceProviderId: { 
        type: Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    date: { 
        type: Date, 
        required: true 
    },
    orderType: { 
        type: String, 
        enum: ["direct", "custom"], 
        required: true 
    },
    serviceType: { 
        type: String, 
        enum: ["photography", "videography"], 
        required: true 
    }, // photography, videography
    location: { 
        type: String 
    },
    time: { 
        type: String 
    },
    price: { 
        type: Number 
    },
    vatAmount: {
        type: Number,
        default: 0,
    },
    totalPrice: {
        type: Number,
    },
    packageId: { 
        type: Schema.Types.ObjectId, 
        ref: "Package" 
    },
    deliveryDate: { 
        type: Date 
    },
    lastDeliveryDate: { 
        type: Date 
    },
    budget_range: { 
        type: String 
    },
    duration: { 
        type: String 
    },
    streetAddress: { 
        type: String 
    },
    town: { 
        type: String 
    },
    country: { 
        type: String 
    },
    
    isRegisterAsCompany: { 
        type: Boolean, 
        default: false 
    },
    companyName: { 
        type: String 
    },
    ICO: { 
        type: String 
    },
    DIC: { 
        type: String 
    },
    IC_DPH: { 
        type: String 
    },
    name: { 
        type: String 
    },
    sureName: { 
        type: String 
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "inProgress", "delivered", "cancelled"],
      default: "pending",
    },
    extensionRequests: { 
        type: [ExtensionRequestSchema], 
        default: [] 
    },
    description: { 
        type: String 
    },
    isDeleted: { 
        type: Boolean, 
        default: false 
    },
  },
  { timestamps: true }
);

export const EventOrder = model<IEventOrder, IEventOrderModel>("EventOrder", EventOrderSchema);
