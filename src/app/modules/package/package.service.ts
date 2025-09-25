import { Package } from "./package.model";
import { IPackage, IUpdatePackage } from "./package.interface";
import QueryBuilder from "../../builder/QueryBuilder";
import { deleteFile } from "../../utils/fileHelper";

const createPackage = async (payload: IPackage) => {
  return await Package.create(payload);
};

const getAllPackages = async (query: Record<string, any> = {}) => {
  const packageQuery = new QueryBuilder(
    Package.find({ isDeleted: false }).populate({
      path: "authorId",
      select: "name sureName role profileImage",
    }),
    query
  )
    .search(["title", "description"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await packageQuery.modelQuery;
  const meta = await packageQuery.countTotal();

  return { meta, result };
};

const getPackageById = async (id: string) => {
  return await Package.findOne({ _id: id, isDeleted: false }).populate({
    path: "authorId",
    select: "name sureName role profileImage",
  });
};

const getMyPackages = async (userId: string, query: Record<string, unknown>) => {
  const packageQuery = new QueryBuilder(
    Package.find({ authorId: userId, isDeleted: false }).populate({
      path: "authorId",
      select: "name sureName",
    }),
    query
  )
    .search(["title", "description"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await packageQuery.modelQuery;
  const meta = await packageQuery.countTotal();

  return { meta, result };
};

const getPendingPackages = async (query: Record<string, any> = {}) => {
  const filter = { approvalStatus: "pending", isDeleted: false };

  const packageQuery = new QueryBuilder(Package.find(filter), query)
    .search(["title", "description"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await packageQuery.modelQuery;
  const meta = await packageQuery.countTotal();

  return { meta, result };
};

const updatePackage = async (id: string, userId: string, payload: IUpdatePackage) => {
  // Replace old thumbnail if a new one is uploaded
  if (payload.thumbnailImage) {
    const existing = await Package.findOne({
      _id: id,
      authorId: userId,
      isDeleted: false,
    });

    if (!existing) {
      throw new Error("Package not found or you don't have permission");
    }

    if (existing.thumbnailImage) {
      deleteFile(existing.thumbnailImage);
    }
  }

  return Package.findOneAndUpdate(
    { _id: id, authorId: userId, isDeleted: false },
    payload,
    { new: true }
  );
};

const updateApprovalStatusByAdmin = async (id: string, status: string) => {
  return await Package.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { approvalStatus: status },
    { new: true }
  );
};

const deletePackage = async (id: string, userId: string) => {
  return await Package.findOneAndUpdate(
    { _id: id, authorId: userId, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );
};

export const PackageService = {
  createPackage,
  getAllPackages,
  getPackageById,
  getMyPackages,
  getPendingPackages,
  updatePackage,
  updateApprovalStatusByAdmin,
  deletePackage,
};
