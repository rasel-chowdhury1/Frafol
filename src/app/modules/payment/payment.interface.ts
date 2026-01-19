import { Model, Types } from "mongoose";

export type PaymentStatus = "pending" | "completed" | "failed";
export type PaymentMethod = "stripe" | "card" | "bank";
export type PaymentType = "event" | "gear" | "workshop" | "subscription";

export interface IServiceProviderBreakdown {
  serviceProviderId: Types.ObjectId;
  amount: number;
  commission: number;
  netAmount: number;
  serviceProviderPaid?: boolean;
  serviceProviderPaidAt?: Date;
}

export interface IPayment {
  transactionId: string;
  userId: Types.ObjectId;
  serviceProviderId: Types.ObjectId;
    // Multiple sellers for gear payments
  serviceProviders?: IServiceProviderBreakdown[];
  mainOrderIdForGear?: string;
  amount: number;
  commission: number;
  netAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  subscriptionDays?: number;
  eventOrderId?: Types.ObjectId;
  gearOrderIds?: Types.ObjectId[];
  workshopId?: Types.ObjectId;
  serviceProviderPaid?: boolean;
  serviceProviderPaidAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPaymentModel extends Model<IPayment> {}

export interface GetPaymentsQuery {
  search?: string;
  paymentStatus?: "pending" | "completed" | "failed" | "refound";
  paymentType?: "event" | "gear" | "workshop";
  paymentMethod?: "stripe" | "card" | "bank";
  startDate?: string;
  endDate?: string;
  limit?: number;
  page?: number;
  sortBy?: string;
  order?: "asc" | "desc";
}
