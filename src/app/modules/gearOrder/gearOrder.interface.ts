import { Types } from 'mongoose';

export interface IGearOrder {
  orderId: string;
  mainOrderId: string;
  clientId: Types.ObjectId;
  sellerId: Types.ObjectId;
  gearMarketplaceId: Types.ObjectId;
  orderStatus: 'pending' | 'shipped' | 'cancelled';
  paymentStatus: 'pending' | 'received';
  name: string;
  shippingAddress: string;
  postCode: string;
  town: string;
  mobileNumber: string;
  email: string;
  loginAsCompany: boolean;
   ico?: string;
  dic?: string;
  ic_dph?: string;
  deliveryNote?: string;
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
  ico?: string;
  dic?: string;
  ic_dph?: string;
  deliveryNote?: string;
}
