import { GearMarketplace } from "./gearMarketplace.model";
import { IGearMarketplace, IUpdateGearMarketplace } from "./gearMarketplace.interface";
import QueryBuilder from "../../builder/QueryBuilder";
import { deleteFile } from "../../utils/fileHelper";

const createGearMarketplace = async (payload: IGearMarketplace) => {
  return await GearMarketplace.create(payload);
};

const getAllGearMarketplaces = async (query: Record<string, unknown>) => {
  const gearQuery = new QueryBuilder(
    GearMarketplace.find({ isDeleted: false })
      .populate({path: "authorId", select: "name sureName" })
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
      .populate({path: "authorId", select: "name sureName" })
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
    .populate({path: "authorId", select: "name sureName" })
    .populate({path: "categoryId", select: "title" });
};

const updateGearMarketplace = async (
  id: string,
  userId: string,
  payload: IUpdateGearMarketplace & { deleteGallery?: string[] }
) => {

  console.log('Update Payload:', payload); // Debug log

  const { gallery, deleteGallery, ...rest } = payload;

  // Build update object
  const updateData: any = { ...rest };

  console.log('Update Data before gallery processing:', updateData); // Debug log

  if (gallery && gallery.length > 0) {
    // Push new images into gallery
    updateData.$push = { gallery: { $each: gallery } };
  }

  if (deleteGallery && deleteGallery.length > 0) {
    // Pull specific images from gallery
    updateData.$pull = { gallery: { $in: deleteGallery } };
  }

  console.log('Final Update Data:', updateData); // Debug log
  let updatedDoc = null;
try {
      // Update DB first
  //  updatedDoc = await GearMarketplace.findOneAndUpdate(
  //   { _id: id, authorId: userId, isDeleted: false },
  //   updateData,
  //   { new: true }
  // );

  await GearMarketplace.findOneAndUpdate(
  { _id: id, authorId: userId, isDeleted: false },
  [
    {
      $set: {
        ...rest,
        gallery: {
          $concatArrays: [
            {
              $filter: {
                input: "$gallery",
                cond: { $not: { $in: ["$$this", deleteGallery] } }
              }
            },
            gallery || []
          ]
        }
      }
    }
  ],
  { new: true }
);

} catch (error) {
  console.error('Error updating GearMarketplace:', error);
  throw error; // rethrow after logging
}
  // If DB update success and deleteGallery exists → remove physical files
  if (updatedDoc && deleteGallery && deleteGallery.length > 0) {
    for (const filePath of deleteGallery) {
      try {
        await deleteFile(filePath); // utility you already made
      } catch (err) {
        console.error(`Failed to delete file ${filePath}:`, err);
      }
    }
  }

  return updatedDoc;
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

  const userQuery = new QueryBuilder(GearMarketplace.find(roleFilter), query)
    .search(['name', 'description', 'condition']) // corrected search fields
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await userQuery.modelQuery;
  const meta = await userQuery.countTotal();

  return { meta, result };
};

const deleteGearMarketplace = async (id: string, userId: string) => {
  return await GearMarketplace.findOneAndUpdate(
    { _id: id, authorId: userId, isDeleted: false }, // only author can delete
    { isDeleted: true },
    { new: true }
  );
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
};
