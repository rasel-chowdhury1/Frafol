
import { Community } from "./community.model";
import { ICommunity } from "./community.interface";
import { hasForbiddenContent } from "./community.utils";
import AppError from "../../error/AppError";
import { deleteFile } from "../../utils/fileHelper";
import { CommunityEngagementStats } from "../communityEngagementStats/communityEngagementStats.model";
import QueryBuilder from "../../builder/QueryBuilder";
import { Types } from "mongoose";

const createCommunity = async (payload: ICommunity) => {
  const { title, text } = payload;

  let approvalStatus: "pending" | "approved" = "approved";

  if (hasForbiddenContent(title) || hasForbiddenContent(text)) {
    approvalStatus = "pending";
  }

  const post = await Community.create({ ...payload, approvalStatus });
  return post;
};

const getAllCommunities = async (userId: string, role: string, query: Record<string, any> = {}) => {

  // Base query
  const baseQuery = Community.find({ isDeleted: false })
    .populate({
      path: "authorId",
      select: "name sureName role profileImage",
    });

  if (role !== "admin") {
    // Only approved communities
  baseQuery.where({ approvalStatus: "approved" });

  // Exclude communities created by current user
  // baseQuery.where({ authorId: { $ne: userId } });
  }

  // Use QueryBuilder for search, filter, sort, pagination
  const qb = new QueryBuilder(baseQuery, query)
    .search(["title", "text"]) // searchable fields
    .filter()
    .sort()
    .paginate()
    .fields();

  const communities = await qb.modelQuery.lean(); // lean for faster access
  const meta = await qb.countTotal();

  // ✅ Add engagement totals
  const communityIds = communities.map((c: any) => c._id);
  const engagementStats = await CommunityEngagementStats.find({
    communityId: { $in: communityIds },
  }).lean();

  const engagementMap = new Map();
  engagementStats.forEach((stat) => {
    engagementMap.set(stat.communityId.toString(), {
      totalLikes: stat.likes.length,
      totalViewers: stat.viewers.length,
      totalComments: stat.comments.length,
      isLiked: stat.likes.some((id) => id.toString() === userId),
    });
  });

  // Merge totals into communities
  const result = communities.map((c: any) => ({
    ...c,
    totalLikes: engagementMap.get(c._id.toString())?.totalLikes || 0,
    totalViewers: engagementMap.get(c._id.toString())?.totalViewers || 0,
    totalComments: engagementMap.get(c._id.toString())?.totalComments || 0,
    isLiked: engagementMap.get(c._id.toString())?.isLiked || false,
  }));

  return { meta, result };
};

const getMyPosts = async (userId: string, query: Record<string, any> = {}) => {
  // Base query: only current user's posts
  const baseQuery = Community.find({ authorId: userId, isDeleted: false })
    .populate({
      path: "authorId",
      select: "name sureName role profileImage",
    });

  // Query builder
  const qb = new QueryBuilder(baseQuery, query)
    .search(["title", "text"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const communities = await qb.modelQuery.lean();
  const meta = await qb.countTotal();

  // Engagement data
  const communityIds = communities.map((c: any) => c._id);
  const engagementStats = await CommunityEngagementStats.find({
    communityId: { $in: communityIds },
  }).lean();

  const engagementMap = new Map();
  engagementStats.forEach((stat: any) => {
    engagementMap.set(stat.communityId.toString(), {
      totalLikes: stat.likes.length,
      totalViewers: stat.viewers.length,
      totalComments: stat.comments.length,
      isLiked: stat.likes.some(
        (likeUser: any) => likeUser.toString() === userId
      ),
    });
  });

  // Merge data into response
  const result = communities.map((c: any) => {
    const stats = engagementMap.get(c._id.toString());
    return {
      ...c,
      totalLikes: stats?.totalLikes || 0,
      totalViewers: stats?.totalViewers || 0,
      totalComments: stats?.totalComments || 0,
      isLiked: stats?.isLiked || false,
    };
  });

  return { meta, result };
};


const adminGetAll = async (query: Record<string, any> = {}) => {
    // Base query: only current user's posts
  const baseQuery = Community.find({  isDeleted: false })
    .populate({
      path: "authorId",
      select: "name sureName role profileImage",
    });

  // Wrap in QueryBuilder
  const qb = new QueryBuilder(baseQuery, query)
    .search(["title", "text"])  // searchable fields
    .filter()
    .sort()
    .paginate()
    .fields();

  const communities = await qb.modelQuery.lean(); // use lean for faster performance
  const meta = await qb.countTotal();

  // ✅ Add engagement totals
  const communityIds = communities.map((c: any) => c._id);
  const engagementStats = await CommunityEngagementStats.find({
    communityId: { $in: communityIds },
  }).lean();

  const engagementMap = new Map();
  engagementStats.forEach((stat) => {
    engagementMap.set(stat.communityId.toString(), {
      totalLikes: stat.likes.length,
      totalViewers: stat.viewers.length,
      totalComments: stat.comments.length,
    });
  });

  // Merge totals into communities
  const result = communities.map((c: any) => ({
    ...c,
    totalLikes: engagementMap.get(c._id.toString())?.totalLikes || 0,
    totalViewers: engagementMap.get(c._id.toString())?.totalViewers || 0,
    totalComments: engagementMap.get(c._id.toString())?.totalComments || 0,
  }));

  return { meta, result };
};


const getCommunityById = async (userId: string, communityId: string) => {
  // 1️⃣ Fetch the community
  const community = await Community.findById(communityId)
    .populate({
      path: "authorId",
      select: "name sureName role profileImage",
    });

  if (!community || community.isDeleted) {
    return null; // or throw new AppError(404, "Community not found")
  }

  // 2️⃣ Log viewer in background
  CommunityEngagementStats.findOneAndUpdate(
    { communityId },
    { $addToSet: { viewers: userId } }, // add user only if not exists
    { new: true, upsert: true }
  ).exec();

  // 3️⃣ Fetch engagement stats
  const stats = await CommunityEngagementStats.findOne({ communityId })
    .select("likes viewers comments")
    .lean();

  const totalLikes = stats?.likes?.length || 0;
  const totalViewers = stats?.viewers?.length || 0;

  const totalComments = stats?.comments?.reduce((acc, comment) => {
    acc += 1; // count the comment itself
    if (comment.replies && Array.isArray(comment.replies)) {
      acc += comment.replies.length;
    }
    return acc;
  }, 0) || 0;

  const isLiked = stats?.likes?.some((id) => id.toString() === userId) || false;

  // 4️⃣ Prepare full comments array with replies
  const comments = stats?.comments?.map((c) => ({
    _id: c._id,
    user: c.user,
    text: c.text,
    createdAt: c.createdAt,
    replies: c.replies || [],
  })) || [];


  // 6️⃣ Return enriched object
  return {
    ...community.toObject(),
    totalLikes,
    totalViewers,
    totalComments,
    isLiked,
    comments,
  };
};


const getCommentsById = async (communityId: string, userId: string) => {
  if (!Types.ObjectId.isValid(communityId)) {
    throw new Error("Invalid communityId");
  }

  const stats = await CommunityEngagementStats.findOne({ communityId })
    .populate({
      path: "comments.user",
      select: "name sureName profileImage",
    })
    .populate({
      path: "comments.replies.user",
      select: "name sureName profileImage",
    })
    .lean();

  if (!stats) {
    return { comments: [], totalComments: 0 };
  }

  // ✅ Prepare structured comments
  const comments = stats.comments?.map((c) => ({
    _id: c._id,
    user: c.user,
    text: c.text,
    createdAt: c.createdAt,
    replies: c.replies?.map((r) => ({
      _id: r._id,
      user: r.user,
      text: r.text,
      createdAt: r.createdAt,
    })) || [],
  })) || [];

  return comments;
};


const getPendingCommunities = async (query: Record<string, any>) => {
  const communityQuery = new QueryBuilder<ICommunity>(
    Community.find({ approvalStatus: "pending", isDeleted: false }).populate(
      "authorId",
      "name email profileImage role"
    ),
    query
  )
    .search(["title", "text"]) // allows search by title or text
    .filter() // allows dynamic filtering
    .sort()
    .paginate()
    .fields();

  const result = await communityQuery.modelQuery;
  const meta = await communityQuery.countTotal();

  return { meta, data: result };
};

// getCommentsById

const updateCommunity = async (
  id: string,
  userId: string,
  payload: Partial<ICommunity> & { deleteImages?: string[] }
) => {
  const { title, text, images, deleteImages, ...rest } = payload;

  // Forbidden content check → reset approvalStatus if needed
  if (hasForbiddenContent(title || "") || hasForbiddenContent(text || "")) {
    rest.approvalStatus = "pending";
  } 

  // ✅ Include title and text in update fields
  const updateFields: any = { ...rest };
  if (title !== undefined) updateFields.title = title;
  if (text !== undefined) updateFields.text = text;

  // Step 1: Update regular fields (exclude images)
  let updatedDoc = await Community.findOneAndUpdate(
    { _id: id, authorId: userId, isDeleted: false },
    { $set: updateFields },
    { new: true }
  );

  if (!updatedDoc) {
    throw new AppError(404, "Community Post not found or unauthorized");
  }

  // Step 2: Add new images if any
  if (images?.length) {
    updatedDoc = await Community.findByIdAndUpdate(
      id,
      { $push: { images: { $each: images } } },
      { new: true }
    );
  }

  // Step 3: Remove deleted images if any
  if (deleteImages?.length) {
    updatedDoc = await Community.findByIdAndUpdate(
      id,
      { $pull: { images: { $in: deleteImages } } },
      { new: true }
    );

    // Remove physical files
    for (const filePath of deleteImages) {
      try {
        await deleteFile(filePath);
      } catch (err) {
        console.error("Failed to delete file:", filePath, err);
      }
    }
  }

  return updatedDoc;
};



const approvePost = async (id: string) => {
  return await Community.findByIdAndUpdate(
    id,
    { approvalStatus: "approved" },
    { new: true }
  );
};

const rejectPost = async (id: string) => {
  return await Community.findByIdAndUpdate(
    id,
    { approvalStatus: "rejected" },
    { new: true }
  );
};

const deleteCommunity = async (
  communityId: string,
  userId: string,
  userRole: string
) => {
  if (!Types.ObjectId.isValid(communityId)) {
    throw new AppError(400, "Invalid Community ID");
  }

  const community = await Community.findById(communityId);

  if (!community || community.isDeleted) {
    throw new AppError(404, "Community not found");
  }

  // ✅ Authorization: only owner or admin
  if (community.authorId.toString() !== userId && userRole !== "admin") {
    throw new AppError(403, "Unauthorized to delete this community post");
  }

  // ✅ Soft delete
  const deleted = await Community.findByIdAndUpdate(
    communityId,
    { $set: { isDeleted: true } },
    { new: true }
  );

  return deleted;
};

export const CommunityService = {
  createCommunity,
  getAllCommunities,
  getPendingCommunities,
  getCommunityById,
  getCommentsById,
  getMyPosts,
  adminGetAll,
  updateCommunity,
  approvePost,
  rejectPost,
  deleteCommunity
};
