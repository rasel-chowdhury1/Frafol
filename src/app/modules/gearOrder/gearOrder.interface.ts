import { Types } from 'mongoose';

export interface IStatusTimestamps {
  createdAt?: Date;
  paymentCompletedAt?: Date;
  deliveryRequestAt?: Date;
  deliveryRequestDeclineAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
}

export interface IGearOrder {
  orderId: string;
  clientId: Types.ObjectId;
  sellerId: Types.ObjectId;
  gearMarketplaceId: Types.ObjectId;
  orderStatus: 'pending' | 'inProgress' | 'deliveryRequest' | 'deliveryRequestDeclined' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'received';
  name: string;
  shippingAddress: string;
  postCode: string;
  town: string;
  mobileNumber: string;
  email: string;
  loginAsCompany: boolean;
  companyName?: string;
   ico?: string;
  dic?: string;
  ic_dph?: string;
  companyAddress?: string;
  deliveryNote?: string;
  deliveryRequestDeclinedReason?: string;
  cancelReason?: string;
  cancelledBy?: Types.ObjectId;
  statusTimestamps: IStatusTimestamps;
  paymentMethod?: string;
  transactionId?: string;
  paymentId?: Types.ObjectId;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateGearOrderPayload {
  userId: string;
  gearMarketPlaceIds: string[];
  name: string;
  shippingAddress: string;
  postCode: string;
  town: string;
  mobileNumber: string;
  email: string;
  loginAsCompany?: boolean;
  companyName?: string;
  ico?: string;
  dic?: string;
  ic_dph?: string;
  companyAddress?: string;
  deliveryNote?: string;
}
