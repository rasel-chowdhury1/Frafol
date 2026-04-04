import { Types } from "mongoose";
import { CommunityEngagementStats } from "./communityEngagementStats.model";
import AppError from "../../error/AppError";
import { Community } from "../community/community.model";
import { sentNotificationForCommentOrReply } from "../../../socketIo";


const likeCommunity = async (communityId: string, userId: string) => {
  return await CommunityEngagementStats.findOneAndUpdate(
    { communityId },
    { $addToSet: { likes: userId } },
    { upsert: true, new: true }
  );
};

const unlikeCommunity = async (communityId: string, userId: string) => {
  return await CommunityEngagementStats.findOneAndUpdate(
    { communityId },
    { $pull: { likes: userId } },
    { new: true }
  );
};

const addCommentOrReply = async (communityId: string, userId: string, text: string, commentId?: string) => {

  let result;
  if (commentId) {
    result = await CommunityEngagementStats.findOneAndUpdate(
      { communityId, "comments._id": commentId },
      { $push: { "comments.$.replies": { user: userId, text } } },
      { upsert: true, new: true }
    );
  } else {
    result = await CommunityEngagementStats.findOneAndUpdate(
      { communityId },
      { $push: { comments: { user: userId, text } } },
      { upsert: true, new: true }
    );
  }

  // 🔔 Notify the community author
  const community = await Community.findById(communityId).select("authorId title");
  if (community) {
    sentNotificationForCommentOrReply({
      actorId: new Types.ObjectId(userId),
      receiverId: community.authorId,
      communityTitle: community.title,
      isReply: !!commentId,
      commentText: text,
    }).catch((err) => console.error("Notification failed:", err));
  }

  return result;
};

const addReply = async (
  communityId: string,
  commentId: string,
  userId: string,
  text: string
) => {
  const result = await CommunityEngagementStats.findOneAndUpdate(
    {
      communityId: new Types.ObjectId(communityId),
      "comments._id": new Types.ObjectId(commentId),
    },
    {
      $push: {
        "comments.$.replies": {
          user: new Types.ObjectId(userId),
          text,
          createdAt: new Date(),
        },
      },
    },
    {
      new: true,
    }
  );

  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Community or comment not found"
    );
  }

  return result;
};

const addViewer = async (communityId: string, userId: string) => {
  return await CommunityEngagementStats.findOneAndUpdate(
    { communityId },
    { $addToSet: { viewers: userId } },
    { upsert: true, new: true }
  );
};

export const CommunityEngagementService = {
  likeCommunity,
  unlikeCommunity,
  addCommentOrReply,
  addReply,
  addViewer,
};
