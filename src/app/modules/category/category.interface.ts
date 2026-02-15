import { Types } from "mongoose";

export type CategoryType = "photoGraphy" | "videoGraphy" | "Gear";

export interface ICategory {
  order: number;
  createdBy: Types.ObjectId;
  title: string;
  subTitle?: string;
  image?: string;
  type: CategoryType;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}


export interface IUpdateCategory {
  title: string;
  subTitle?: string;
  image?: string;
  type: CategoryType;
}
