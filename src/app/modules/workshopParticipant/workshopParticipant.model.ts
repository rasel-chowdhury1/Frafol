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
      enum: ['pending', 'received'],
      default: 'pending',
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
