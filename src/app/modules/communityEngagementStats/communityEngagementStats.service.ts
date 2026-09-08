import { Types } from "mongoose";
import { CommunityEngagementStats } from "./communityEngagementStats.model";
import AppError from "../../error/AppError";
import { Community } from "../community/community.model";
import { sentNotificationForCommentOrReply } from "../../../socketIo";
import httpStatus from 'http-status';
import test from "node:test";

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

const addCommentOrReply = async (
  communityId: string,
  userId: string,
  text: string,
  commentId?: string
) => {
  const community = await Community.findById(communityId)
    .select("authorId title")
    .lean();

  if (!community) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Community not found"
    );
  }

  const actorId = new Types.ObjectId(userId);

  let receiverId = community.authorId;
  let isReply = false;
  let result;

  // =========================
  // REPLY
  // =========================
  if (commentId) {
    const targetCommentId = new Types.ObjectId(commentId);

    result = await CommunityEngagementStats.findOneAndUpdate(
      {
        communityId: new Types.ObjectId(communityId),
        "comments._id": targetCommentId,
      },
      {
        $push: {
          "comments.$.replies": {
            user: actorId,
            text,
          },
        },
      },
      {
        new: true,
      }
    ).lean();

    if (!result) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        "Comment not found"
      );
    }

    // Find the comment that received the reply
    const comment = result.comments.find(
      (comment) => comment._id.toString() === commentId
    );

    if (!comment) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        "Comment not found"
      );
    }

    // Reply notification goes to comment owner
    receiverId = comment.user;
    isReply = true;
  }

  // =========================
  // NEW COMMENT
  // =========================
  else {
    result = await CommunityEngagementStats.findOneAndUpdate(
      {
        communityId: new Types.ObjectId(communityId),
      },
      {
        $push: {
          comments: {
            user: actorId,
            text,
          },
        },
      },
      {
        upsert: true,
        new: true,
      }
    ).lean();

    // New comment notification goes to community owner
    receiverId = community.authorId;
  }

  // =========================
  // NOTIFICATION
  // =========================

  await sentNotificationForCommentOrReply({
    actorId,
    receiverId,
    communityTitle: community.title,
    isReply,
    commentText: text,
  }).catch((err) => {
    console.error("Notification failed:", err);
  });

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
