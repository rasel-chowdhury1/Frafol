import { Types } from 'mongoose';

export interface IWorkshopParticipant {
  orderId: string;
  clientId: Types.ObjectId;
  instructorId: Types.ObjectId; // renamed from workshopAuthorId for clarity
  workshopId: Types.ObjectId;
  paymentStatus: "pending" | "completed" | "failed";
  joinedAt?: Date;

  // 💰 Admin → Instructor payment tracking
  instructorPayment: {
    status: "pending" | "received";
    amount: number;
    paidAt?: Date | null;
  };
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
