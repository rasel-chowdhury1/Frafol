import { Schema, model } from "mongoose";
import { IReview } from "./review.interface";

const reviewSchema = new Schema<IReview>(
  {
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
    eventOrderId: {
      type: Schema.Types.ObjectId,
      ref: "EventOrder",
      required: false
    },
  
    rating: { 
      type: Number, 
      required: true, 
    },
    message: { 
      type: String, 
      default: "." 
    },
    status: {
      type: String,
      enum: ["pending", "done"]
    },
    isAnonymous: { 
      type: Boolean, 
      default: false 
    },
    isDeleted: { 
      type: Boolean, 
      required: false 
    },
    
  },
  { 
    timestamps: true }
);

export const Review = model<IReview>("Review", reviewSchema);
