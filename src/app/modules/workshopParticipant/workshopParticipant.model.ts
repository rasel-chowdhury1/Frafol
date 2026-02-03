import { Schema, model } from 'mongoose';
import { IWorkshopParticipant } from './workshopParticipant.interface';

const workshopParticipantSchema = new Schema<IWorkshopParticipant>(
  {
    orderId: { type: String, required: true, unique: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    instructorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    workshopId: { type: Schema.Types.ObjectId, ref: 'Workshop', required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "completed",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    instructorPayment: {
      status: {
        type: String,
        enum: ["pending", "received"],
        default: "pending",
      },
      amount: {
        type: Number,
        required: true,
      },
      paidAt: {
        type: Date,
        default: null,
      },
    },
    streetAddress: { type: String },
    town: { type: String },
    country: { type: String },

    // ✅ Company Info (for custom orders)
    isRegisterAsCompany: { type: Boolean, default: false },
    companyName: { type: String },
    ICO: { type: String },
    DIC: { type: String },
    IC_DPH: { type: String },
    name: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const WorkshopParticipant = model<IWorkshopParticipant>(
  'WorkshopParticipant',
  workshopParticipantSchema
);
