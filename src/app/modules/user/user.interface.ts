import { Model, ObjectId, Schema } from 'mongoose';


export interface TUserCreate {
  profileId: ObjectId,
  name?: string;
  sureName?: string;
  companyName?: string;
  email: string;
  password: string;
  profileImage: string;
  role: string;
  switchRole: string;
  address?: string;
  town?: string;
  country?: string;
  hourlyRate?: number;
  ico?: string;
  dic?: string;
  ic_dph?: string;
  rating?: number;
  specializations: string[];
  newsLetterSub: boolean;
  isBlocked: boolean;
  isDeleted: boolean;
    acceptTerms: boolean;
    about: string;
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
