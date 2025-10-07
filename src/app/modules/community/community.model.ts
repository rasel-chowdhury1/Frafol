import { Schema, model } from "mongoose";
import { ICommunity, ICommunityModel } from "./community.interface";

const communitySchema = new Schema<ICommunity>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    text: { type: String, required: true },
    images: [{ type: String }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Community = model<ICommunity, ICommunityModel>(
  "Community",
  communitySchema
);
