import { Types } from "mongoose";

export interface IWorkshop {
  authorId: Types.ObjectId;
  title: string;
  date: Date;
  time: string;
  locationType: "offline" | "online";
  location?: string; // required if offline
  workshopLink?: string; // required if online
  vatAmount?: number;
  price: number;
  mainPrice: number;
  description: string;
  image: string;
  maxParticipant: number;
  approvalStatus?: "pending" | "approved" | "cancelled";
  declineReason?: string;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUpdateWorkshop {
  title?: string;
  date?: Date;
  time?: string;
  locationType?: "offline" | "online";
  location?: string;
  workshopLink?: string;
  vatAmount?: number;
  price?: number;
  mainPrice?: number;
  description?: string;
  image?: string;
  maxParticipant?: number;
  approvalStatus?: "pending" | "approved" | "cancelled";
  declineReason?: string;
  isDeleted?: boolean;
}
