import { Types } from 'mongoose';

export interface IWorkshopParticipant {
  orderId: string;
  clientId: Types.ObjectId;
  instructorId: Types.ObjectId; // renamed from workshopAuthorId for clarity
  workshopId: Types.ObjectId;
  paymentStatus: 'pending' | 'received';
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
