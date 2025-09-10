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
  const { gallery, deleteGallery, ...rest } = payload;

  // Build update object
  const updateData: any = { ...rest };

  if (gallery && gallery.length > 0) {
    // Push new images into gallery
    updateData.$push = { gallery: { $each: gallery } };
  }

  if (deleteGallery && deleteGallery.length > 0) {
    // Pull specific images from gallery
    updateData.$pull = { gallery: { $in: deleteGallery } };
  }

    // Update DB first
  const updatedDoc = await GearMarketplace.findOneAndUpdate(
    { _id: id, authorId: userId, isDeleted: false },
    updateData,
    { new: true }
  );

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
  updateApprovalStatusByAdmin
};
