import { Date, Model, ObjectId, Schema } from 'mongoose';
import { ICategory } from '../category/category.interface';
import { ITown } from '../town/town.interface';



export interface TUserCreate {
  profileId: ObjectId | null;
  name?: string;
  sureName?: string;
  companyName?: string;
  email: string;
  password: string;
  profileImage: string;
  dateOfBirth?: Date;
  role: string;
  mainRole: string;
  switchRole: string;
  thumbnailImage? : string;
  introVideo ?: string;
  bannerImages?: string[];
  gallery: string[];
  phone: string;
  address?: string;
  town?: string;
  country?: string;
  zipCode?: string;
  minHourlyRate?: number;
  maxHourlyRate?: number;
  ico?: string;
  dic?: string;
  ic_dph?: string;
  rating?: number;
  totalReview: number;
  averageRating: number;
  photographerSpecializations: string[];
  videographerSpecializations: string[];
  newsLetterSub: boolean;
  
  adminVerified: string;
  unAvailability: Date[];
  subscriptionId: ObjectId | null;
  hasActiveSubscription: boolean;
  subscriptionExpiryDate: Date | null;
  subscriptionDays: number;
  about: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  isBlocked: boolean;
  isDeleted: boolean;
  acceptTerms: boolean;
  
  ramcuvaAgree: boolean
}

export interface TUser extends TUserCreate {
  _id: string;
}

export interface DeleteAccountPayload {
  password: string;
}

export interface UserModel extends Model<TUser> {
  isUserExist(email: string): Promise<TUser>;
  
  isUserActive(email: string): Promise<TUser>;

  IsUserExistById(id: string): Promise<TUser>;

  isPasswordMatched(
    plainTextPassword: string,
    hashedPassword: string,
  ): Promise<boolean>;
}

export type IPaginationOption = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};


export interface PaginateQuery {
  role?: string;
  categoryName?: string;
  page?: number;
  limit?: number;
}

export interface VerifiedProfessionalPayload {
  userId: string;
  status: 'pending' | 'verified';
}


export interface IOrderStats {
  totalOrders: number;
  completedOrders: number;
  activeOrders: number;
  cancelledOrders: number;
}
export type OrderStats = {
  totalOrders: number;
  completedPercentage: number;
  pendingPercentage: number;
  cancelledPercentage: number;
};