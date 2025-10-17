import { Schema, model } from 'mongoose';
import { IGearOrder } from './gearOrder.interface';

const gearOrderSchema = new Schema<IGearOrder>(
  {
    orderId: { type: String, required: true, },
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    gearMarketplaceId: { type: Schema.Types.ObjectId, ref: 'GearMarketplace', required: true },
    orderStatus: {
      type: String,
      enum: ['pending', 'shipped', 'cancelled'],
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
    mobileNumber: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
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
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const GearOrder = model<IGearOrder>('GearOrder', gearOrderSchema);
