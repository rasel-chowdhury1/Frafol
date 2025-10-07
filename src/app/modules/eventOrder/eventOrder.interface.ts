import { Document, Model, Types } from "mongoose";

export type OrderStatus = "pending" | "accepted" | "inProgress" | "delivered" | "cancelled";

export interface IEventOrder extends Document {
  orderId: string;
  userId: Types.ObjectId;
  serviceProviderId: Types.ObjectId;
  date: Date;
  orderType: "direct" | "custom";
  serviceType: string; // photography, videography
  location: string;
  time: string;
  price?: number;
  vatAmount?: number;
  totalPrice?: number;
  packageId?: Types.ObjectId;
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
  extensionRequests?: {
    requestedBy: Types.ObjectId;
    newDeliveryDate: Date;
    reason: string;
    approved: boolean;
  }[];
  description?: string;
  isDeleted: boolean;
}

export interface IEventOrderModel extends Model<IEventOrder> {}
