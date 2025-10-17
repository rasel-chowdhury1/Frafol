import { Model, Types } from "mongoose";

export interface IReply {
  user: Types.ObjectId;
  text: string;
  createdAt?: Date;
}

export interface IComment {
  user: Types.ObjectId;
  text: string;
  createdAt?: Date;
  replies?: IReply[];
}

export interface ICommunityEngagementStats {
  communityId: Types.ObjectId;
  likes: Types.ObjectId[];
  comments: IComment[];
  viewers: Types.ObjectId[];
}

export interface ICommunityEngagementStatsModel
  extends Model<ICommunityEngagementStats> {}
