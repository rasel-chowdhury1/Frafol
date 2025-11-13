import { Schema, model } from "mongoose";
import { ICoupon } from "./coupon.interface";

const CouponSchema = new Schema<ICoupon>(
  {
    code: { 
        type: String, 
        required: true,
        unique: true,
        trim: true},
    amount: { 
        type: Number, 
        required: true 
    },
    limit: { 
        type: Number, 
        required: true 
    },
    usedCount: { 
        type: Number, 
        default: 0 
    },
    expiryDate: { 
        type: Date, 
        default: null 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
  },
  { timestamps: true }
);

export const Coupon = model<ICoupon>("Coupon", CouponSchema);
