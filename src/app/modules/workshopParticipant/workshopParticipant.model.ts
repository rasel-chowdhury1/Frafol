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
