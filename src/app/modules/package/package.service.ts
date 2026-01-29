import { Package } from "./package.model";
import { IPackage, IUpdatePackage } from "./package.interface";
import QueryBuilder from "../../builder/QueryBuilder";
import { deleteFile } from "../../utils/fileHelper";
import AppError from "../../error/AppError";
import mongoose from "mongoose";
import { Review } from "../review/review.model";

const createPackage = async (payload: IPackage) => {
  return await Package.create(payload);
};

const getAllPackages = async (query: Record<string, any> = {}) => {
  const packageQuery = new QueryBuilder(
    Package.find({ isDeleted: false,approvalStatus: "approved"  }).populate({
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

  const packageQuery = new QueryBuilder(Package.find(filter).populate({
    path: "authorId",
    select: "name sureName role profileImage",
  }), query)
    .search(["title", "description"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await packageQuery.modelQuery;
  const meta = await packageQuery.countTotal();

  return { meta, result };
};

export const getUserPackageAndReviewStats = async (authorId: string) => {
  if (!mongoose.Types.ObjectId.isValid(authorId)) {
    throw new Error("Invalid author ID");
  }

  // 1️⃣ Get all packages created by the user (latest first)
  const packages = await Package.find({ authorId, approvalStatus: "approved", isDeleted: false })
    .sort({ createdAt: -1 }); // 👈 latest first


  // 2️⃣ Get all reviews received by this user serviceProviderId
  const reviews = await Review.find({ serviceProviderId: authorId, isDeleted: false });


  const totalReviews = reviews.length;

  // 3️⃣ Calculate average rating
  const averageRating =
    totalReviews > 0
      ? parseFloat(
          (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews).toFixed(1)
        )
      : 0;

  // 4️⃣ Count how many reviews per star
  const starCounts = {
    5: reviews.filter((r) => r.rating === 5).length,
    4: reviews.filter((r) => r.rating === 4).length,
    3: reviews.filter((r) => r.rating === 3).length,
    2: reviews.filter((r) => r.rating === 2).length,
    1: reviews.filter((r) => r.rating === 1).length,
  };

  return {
    totalReviews,
    averageRating,
    starCounts,
    packages,
  };
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

const declinePackageById = async (id: string, reason: string) => {

  // Soft delete + mark as declined
  const pkg = await Package.findByIdAndUpdate(
    id,
    { 
      isDeleted: true, 
      approvalStatus: 'rejected' // optional, could use 'declined' if you add this enum
    },
    { new: true, runValidators: true }
  )
  if (!pkg) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to decline the package or package not found');
  }

  return pkg;
}

const deletePackage = async (
  packageId: string,
  userId: string,
  role: "admin" | "user" | "photographer" | "videographer" | "both"
) => {
  if (!packageId) throw new AppError(400, "Package ID is required");

  const filter: any = { _id: packageId, isDeleted: false };

  // Admin can delete any package
  if (role !== "admin") {
    filter.authorId = userId;
  }

  const deletedPackage = await Package.findOneAndUpdate(
    filter,
    { isDeleted: true },
    { new: true }
  );

  if (!deletedPackage) {
    throw new AppError(404, "Package not found or you are not authorized to delete it");
  }

  return deletedPackage;
};

export const PackageService = {
  createPackage,
  getAllPackages,
  getPackageById,
  getMyPackages,
  getPendingPackages,
  getUserPackageAndReviewStats,
  updatePackage,
  updateApprovalStatusByAdmin,
  declinePackageById,
  deletePackage,
};
