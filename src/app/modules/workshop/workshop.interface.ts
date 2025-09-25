import { Types } from "mongoose";

export interface IWorkshop {
  authorId: Types.ObjectId;
  title: string;
  date: Date;
  time: string;
  locationType: "offline" | "online";
  location?: string; // required if offline
  workshopLink?: string; // required if online
  price: number;
  description: string;
  image: string;
  maxParticipant: number;
  approvalStatus?: "pending" | "approved" | "cancelled";
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
  price?: number;
  description?: string;
  image?: string;
  maxParticipant?: number;
  approvalStatus?: "pending" | "approved" | "cancelled";
  isDeleted?: boolean;
}
