import {Model, Types } from "mongoose";

export interface ITown {
  _id?: Types.ObjectId;
  name: string;
  isDeleted?: boolean;
}

export interface TownModel extends Model<ITown> {}
