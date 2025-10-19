import { Model, Types } from "mongoose";

export type PaymentStatus = "pending" | "completed" | "failed";
export type PaymentMethod = "stripe" | "card" | "bank";
export type PaymentType = "event" | "gear" | "workshop";

export interface IServiceProviderBreakdown {
  serviceProviderId: Types.ObjectId;
  amount: number;
  commission: number;
  netAmount: number;
}

export interface IPayment {
  transactionId: string;
  userId: Types.ObjectId;
  serviceProviderId: Types.ObjectId;
    // Multiple sellers for gear payments
  serviceProviders?: IServiceProviderBreakdown[];
  amount: number;
  commission: number;
  netAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  eventOrderId?: Types.ObjectId;
  gearOrderIds?: Types.ObjectId[];
  workshopId?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPaymentModel extends Model<IPayment> {}
