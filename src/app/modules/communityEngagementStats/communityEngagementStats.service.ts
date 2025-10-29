import { CommunityEngagementStats } from "./communityEngagementStats.model";


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

const addComment = async (communityId: string, userId: string, text: string) => {
  return await CommunityEngagementStats.findOneAndUpdate(
    { communityId },
    { $push: { comments: { user: userId, text } } },
    { upsert: true, new: true }
  );
};

const addReply = async (
  communityId: string,
  commentId: string,
  userId: string,
  text: string
) => {

  console.log({communityId,commentId,userId,text});
  // const result = await CommunityEngagementStats.findOneAndUpdate(
  //   { communityId, "comments._id": commentId },
  //   { $push: { "comments.$.replies": { user: userId, text } } },
  //   { new: true }
  // );

  const result2 = await CommunityEngagementStats.findOne({communityId, "comments._id": commentId})

  console.log("result data =>>>>>> ", result2);
  return result2 ;
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
  addComment,
  addReply,
  addViewer,
};
