import { Document, Model, Types } from "mongoose";

export type OrderStatus = "pending" | "declined" | "accepted" | "inProgress" | "deliveryRequest" | "deliveryRequestDeclined" | "delivered" | "cancelRequest" | "cancelRequestDeclined" | "cancelled";

export type PaymentStatus = "Unpaid" | "Paid";

export interface IExtensionRequest {
    _id?: Types.ObjectId; // Added this
  requestedBy: Types.ObjectId;
  newDeliveryDate: Date;
  reason: string;
  approved: boolean;
  status: "pending" | "accepted" | "reject"
}

export interface IStatusTimestamps {
  createdAt?: Date;
  acceptedAt?: Date;
  inProgressAt?: Date;
  deliveryRequestAt?: Date;
  deliveryRequestDeclineAt?: Date;
  deliveredAt?: Date;
  declinedAt?: Date;
  cancelRequestAt?: Date;
  cancelRequestDeclinedAt?: Date;
  cancelledAt?: Date;
}

export interface IStatusHistory {
  status: OrderStatus;
  reason?: string;
  changedAt: Date;
}





export interface IEventOrder extends Document {
  orderId: string;
  userId: Types.ObjectId;
  serviceProviderId: Types.ObjectId;
  date: Date;
  orderType: "direct" | "custom";
  serviceType: "photography" | "videography"; 
  location: string;
  time: string;
  price?: number;
  priceWithServiceFee?: number;
  vatAmount?: number;
  totalPrice?: number;
  packageId?: Types.ObjectId;
  packageName?: string;
  deliveryDate?: Date;
  lastDeliveryDate?: Date;
  budget_range?: string;
  duration?: string;
  streetAddress?: string;
  town?: string;
  country?: string;
  isRegisterAsCompany?: boolean;
  companyName?: string;
  ICO?: string;
  DIC?: string;
  IC_DPH?: string;
  name?: string;
  sureName?: string;
  status: OrderStatus;
  declineReason?: string;
  deliveryRequestDeclinedReason?: string;
  cancelReason?: string;
  cancelledBy?: Types.ObjectId;
  cancelRequestedBy?: Types.ObjectId;
  cancelApprovalBy?: Types.ObjectId;
  cancelApprovalDate?: Date;
  statusTimestamps: IStatusTimestamps;
  statusHistory: IStatusHistory[];
  extensionRequests: IExtensionRequest[];
  description?: string;
  paymentStatus: PaymentStatus;
  isDeleted: boolean;
}

export interface IEventOrderModel extends Model<IEventOrder> {}
