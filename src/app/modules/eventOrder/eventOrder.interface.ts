import { Document, Model, Types } from "mongoose";

export type OrderStatus = "pending" | "declined" | "accepted" | "inProgress" | "deliveryRequest" | "delivered" | "cancelled";

export interface IExtensionRequest {
  requestedBy: Types.ObjectId;
  newDeliveryDate: Date;
  reason: string;
  approved: boolean;
}

export interface IStatusTimestamps {
  createdAt?: Date;
  acceptedAt?: Date;
  inProgressAt?: Date;
  deliveryRequestAt?: Date;
  deliveredAt?: Date;
  declinedAt?: Date;
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
  cancelReason?: string;
  cancelledBy?: Types.ObjectId;
  statusTimestamps: IStatusTimestamps;
  statusHistory: IStatusHistory[];
  extensionRequests: IExtensionRequest[];
  description?: string;
  paymentStatus: string;
  isDeleted: boolean;
}

export interface IEventOrderModel extends Model<IEventOrder> {}
