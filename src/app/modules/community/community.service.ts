import { Community } from "./community.model";
import { ICommunity } from "./community.interface";
import QueryBuilder from "../../builder/QueryBuilder";
import AppError from "../../error/AppError";
import { deleteFile } from "../../utils/fileHelper";

const createCommunity = async (payload: ICommunity) => {
  return await Community.create(payload);
};

const getAllCommunities = async (query: Record<string, any> = {}) => {
  const qb = new QueryBuilder(
    Community.find({ isDeleted: false }).populate("authorId", "name profileImage"),
    query
  )
    .search(["title", "text"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await qb.modelQuery;
  const meta = await qb.countTotal();

  return { meta, result };
};

const getCommunityById = async (id: string) => {
  return await Community.findOne({ _id: id, isDeleted: false }).populate(
    "authorId",
    "name profileImage"
  );
};

const updateCommunity = async (id: string, userId: string, payload: Partial<ICommunity>) => {
  return await Community.findOneAndUpdate(
    { _id: id, authorId: userId, isDeleted: false },
    payload,
    { new: true }
  );
};


const updateCommunity = async (
  id: string,
  userId: string,
  payload: Partial<ICommunity> & { deleteGallery?: string[] }
) => {
  const { images, deleteGallery, ...rest } = payload;


  try {
    // Build the update object
    const updatePipeline: any[] = [
      {
        $set: {
          ...rest,
          gallery: {
            $concatArrays: [
              {
                $filter: {
                  input: "$gallery",
                  cond: { $not: { $in: ["$$this", deleteGallery || []] } },
                },
              },
              gallery || [],
            ],
          },
        },
      },
    ];

    // Perform the update
    const updatedDoc = await Community.findOneAndUpdate(
      { _id: id, authorId: userId, isDeleted: false },
      updatePipeline,
      { new: true }
    );

    if (!updatedDoc) {
      throw new AppError(400, "Gear Marketplace item not found or cannot be updated");
    }

    // Remove physical files if deleteGallery exists
    if (deleteGallery && deleteGallery.length > 0) {
      for (const filePath of deleteGallery) {
        try {
          await deleteFile(filePath);
        } catch (err) {
          console.error(`Failed to delete file ${filePath}:`, err);
          // Skip error, don't crash server
        }
      }
    }

    return updatedDoc;
  } catch (error) {
    console.error("Error updating GearMarketplace:", error);
    throw error; // rethrow after logging
  }
};

const deleteCommunity = async (id: string, userId: string) => {
  return await Community.findOneAndUpdate(
    { _id: id, authorId: userId, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );
};

export const CommunityService = {
  createCommunity,
  getAllCommunities,
  getCommunityById,
  updateCommunity,
  deleteCommunity,
};
