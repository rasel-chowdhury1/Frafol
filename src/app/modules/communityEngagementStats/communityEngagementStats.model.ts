import { Schema, model } from "mongoose";
import {
  ICommunityEngagementStats,
  ICommunityEngagementStatsModel,
} from "./communityEngagementStats.interface";

const ReplySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const CommentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    replies: [ReplySchema],
  },
  { _id: true }
);

const CommunityEngagementStatsSchema = new Schema<ICommunityEngagementStats>(
  {
    communityId: {
      type: Schema.Types.ObjectId,
      ref: "Community",
      required: true,
      unique: true,
    },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    viewers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    comments: {
      type: [CommentSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export const CommunityEngagementStats = model<
  ICommunityEngagementStats,
  ICommunityEngagementStatsModel
>("CommunityEngagementStats", CommunityEngagementStatsSchema);
