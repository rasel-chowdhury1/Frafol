import { Document } from "mongoose";

export interface ICommissionSetup extends Document {
  photoVideoGrapy: number;
  minimumCharge: number;
  gearOrders: number;
  workShop: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUpdateCommissionSetup {
  photoVideoGrapy?: number;
  minimumCharge?: number;
  gearOrders?: number;
  workShop?: number;
}
