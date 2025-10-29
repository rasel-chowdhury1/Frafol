import { Schema, model } from 'mongoose';
import { IGearOrder } from './gearOrder.interface';

// =========================
// 🕒 Status Timestamps Subdocument
// =========================
const StatusTimestampsSchema = new Schema(
  {
    createdAt: { type: Date },
    paymentCompletedAt: {type: Date},
    deliveryRequestAt: { type: Date },
    deliveryRequestDeclineAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { _id: false }
);

const gearOrderSchema = new Schema<IGearOrder>(
  {
    orderId: { 
      type: String, 
      required: true, 
    },
    clientId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    sellerId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    gearMarketplaceId: { 
      type: Schema.Types.ObjectId, 
      ref: 'GearMarketplace', 
      required: true 
    },
    orderStatus: {
      type: String,
      enum: ['pending', 'inProgress', "deliveryRequest","deliveryRequestDeclined", "delivered", 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'received'],
      default: 'pending',
    },
    name: {
      type: String,
      default: ""
    },
    shippingAddress: {
        type: String,
        default: ""
    },
    postCode: {
        type: String,
        default: ""
    },
    town: {
        type: String,
        default: ""
    },
    mobileNumber: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    loginAsCompany: {
      type: Boolean,
      default: false
    },
    ico: {
        type: String,
        default: ""
    },
    dic: {
        type: String,
        default: ""
    },
    ic_dph: {
        type: String,
        default: ""
    },
    companyAddress: {
        type: String,
        default: ""
    },

    deliveryNote: {
        type: String,
        default: ""
    },
    deliveryRequestDeclinedReason: {
      type: String,
      trim: true
    },
    cancelReason: { type: String, trim: true },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
        // ✅ Status Timestamps
    statusTimestamps: {
      type: StatusTimestampsSchema,
      default: () => ({ createdAt: new Date() }),
    },

    paymentId: {
      type: Schema.Types.ObjectId, 
      ref: 'Payment' 
    },

    isDeleted: { 
      type: Boolean, 
      default: false 
    },
  },
  {
    timestamps: true,
  }
);

export const GearOrder = model<IGearOrder>('GearOrder', gearOrderSchema);
