import { GearMarketplace } from "./gearMarketplace.model";
import { IGearMarketplace, IUpdateGearMarketplace } from "./gearMarketplace.interface";
import QueryBuilder from "../../builder/QueryBuilder";
import { deleteFile } from "../../utils/fileHelper";
import AppError from "../../error/AppError";
import mongoose from "mongoose";

const createGearMarketplace = async (payload: IGearMarketplace) => {
  return await GearMarketplace.create(payload);
};

const getAllGearMarketplaces = async (query: Record<string, unknown>) => {

  if (query.categoryId) {
      query.categoryId = new mongoose.Types.ObjectId(query.categoryId as string);
    }

  const gearQuery = new QueryBuilder(
    GearMarketplace.find({ approvalStatus: "approved", isDeleted: false })
      .populate({path: "authorId", select: "name sureName role email" })
      .populate({path: "categoryId", select: "title" }),
    query
  )
    .search(["name", "description"]) // searchable fields
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await gearQuery.modelQuery;
  const meta = await gearQuery.countTotal();

  return { meta, result };
};

const getMyGearMarketplaces = async (userId: string, query: Record<string, unknown>) => {
  const gearQuery = new QueryBuilder(
    GearMarketplace.find({ authorId:userId,isDeleted: false })
      .populate({path: "authorId", select: "name sureName role email" })
      .populate({path: "categoryId", select: "title" }),
    query
  )
    .search(["name", "description"]) // searchable fields
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await gearQuery.modelQuery;
  const meta = await gearQuery.countTotal();

  return { meta, result };
};


const getGearMarketplaceById = async (id: string) => {
  return await GearMarketplace.findOne({ _id: id, isDeleted: false })
    .populate({path: "authorId", select: "name sureName role email" })
    .populate({path: "categoryId", select: "title" });
};

const updateGearMarketplace = async (
  id: string,
  userId: string,
  payload: IUpdateGearMarketplace & { deleteGallery?: string[] }
) => {
  const { gallery, deleteGallery, ...rest } = payload;

  if (rest.categoryId) {
  rest.categoryId = new mongoose.Types.ObjectId(rest.categoryId);
}

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
    const updatedDoc = await GearMarketplace.findOneAndUpdate(
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

const updateApprovalStatusByAdmin = async (id: string, status: string) => {
  return await GearMarketplace.findOneAndUpdate(
    { _id: id, isDeleted: false }, // only author can delete
    { approvalStatus: status },
    { new: true }
  );
};

const getPendingGearMarketplace = async (
  query: Record<string, any> = {}
) => {
  // Filter users by role
  const roleFilter = {
    approvalStatus: "pending",
    isDeleted: false
  };

  const userQuery = new QueryBuilder(
    GearMarketplace.find(roleFilter)
      .populate({ path: "categoryId", select: "title" })
      .populate({ path: "authorId", select: "name email role sureName" }), // adjust fields as needed
    query
  )
    .search(['name', 'description', 'condition']) // corrected search fields
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await userQuery.modelQuery;
  const meta = await userQuery.countTotal();

  return { meta, result };
};


const declineGearById = async (gearId: string, reason?: string) => {
  // Soft delete + mark as declined
  const gear = await GearMarketplace.findByIdAndUpdate(
    gearId,
    { 
      isDeleted: true, 
      approvalStatus: 'cancelled' // optional, could use 'declined' if you add this enum
    },
    { new: true, runValidators: true }
  )

  if (!gear) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to decline the gear item or item not found');
  }

  return gear;
};

const deleteGearMarketplace = async (id: string, userId: string, userRole: string) => {
  console.log(`Attempting to delete GearMarketplace with id: ${id} by user: ${userId}, role: ${userRole}`);

  // Base query
  const query: any = { _id: id, isDeleted: false };

  // If not admin, enforce authorId check
  if (userRole !== "admin") {
    query.authorId = userId;
  }

  const result = await GearMarketplace.findOneAndUpdate(
    query,
    { isDeleted: true },
    { new: true }
  );

  console.log("Delete Result:", result);
  return result;
};

export const GearMarketplaceService = {
  createGearMarketplace,
  getAllGearMarketplaces,
  getGearMarketplaceById,
  updateGearMarketplace,
  deleteGearMarketplace,
  getMyGearMarketplaces,
  updateApprovalStatusByAdmin,
  getPendingGearMarketplace,
  declineGearById
};
