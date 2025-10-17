import { Types } from 'mongoose';

export interface IGearOrder {
  orderId: string;
  clientId: Types.ObjectId;
  sellerId: Types.ObjectId;
  gearMarketplaceId: Types.ObjectId;
  orderStatus: 'pending' | 'shipped' | 'cancelled';
  paymentStatus: 'pending' | 'received';
  name: string;
  shippingAddress: string;
  mobileNumber: string;
  email: string;
   ico?: string;
  dic?: string;
  ic_dph?: string;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
