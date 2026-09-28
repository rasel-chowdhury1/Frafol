import { Package } from "./package.model";
import { IPackage, IUpdatePackage } from "./package.interface";
import QueryBuilder from "../../builder/QueryBuilder";
import { deleteFileFromS3, resolveFileUrl } from "../../helpers/s3FileHelper";
import AppError from "../../error/AppError";
import mongoose from "mongoose";
import { Review } from "../review/review.model";
import httpStatus from 'http-status';
import { sentNotificationForPackageApproved, sentNotificationForPackageDeclined } from "../../../socketIo";
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

  const packages = await packageQuery.modelQuery.lean();
  const meta = await packageQuery.countTotal();

  const result = await Promise.all(
    packages.map(async (p: any) => ({ ...p, thumbnailImage: await resolveFileUrl(p.thumbnailImage) })),
  );

  return { meta, result };
};

const getPackageById = async (id: string) => {
  const pkg = await Package.findOne({ _id: id, isDeleted: false })
    .populate({
      path: "authorId",
      select: "name sureName role profileImage",
    })
    .lean();

  if (!pkg) return pkg;
  return { ...pkg, thumbnailImage: await resolveFileUrl((pkg as any).thumbnailImage) };
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

  const packages = await packageQuery.modelQuery.lean();
  const meta = await packageQuery.countTotal();

  const result = await Promise.all(
    packages.map(async (p: any) => ({ ...p, thumbnailImage: await resolveFileUrl(p.thumbnailImage) })),
  );

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

  const packages = await packageQuery.modelQuery.lean();
  const meta = await packageQuery.countTotal();

  const result = await Promise.all(
    packages.map(async (p: any) => ({ ...p, thumbnailImage: await resolveFileUrl(p.thumbnailImage) })),
  );

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
  const reviews = await Review.find({ serviceProviderId: authorId, status: "done", isDeleted: false });


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
  let oldThumbnailKey: string | undefined;

  if (payload.thumbnailImage) {
    const existing = await Package.findOne({
      _id: id,
      authorId: userId,
      isDeleted: false,
    });

    if (!existing) {
      throw new Error("Package not found or you don't have permission");
    }

    oldThumbnailKey = existing.thumbnailImage;
  }

  const updated = await Package.findOneAndUpdate(
    { _id: id, authorId: userId, isDeleted: false },
    payload,
    { new: true }
  );

  // Only remove the old S3 object once the new one is saved
  if (oldThumbnailKey) {
    deleteFileFromS3(oldThumbnailKey).catch((err) =>
      console.error('Failed to delete old package thumbnail from S3:', err),
    );
  }

  return updated;
};

const updateApprovalStatusByAdmin = async (id: string, status: string, reason?: string) => {
  const updateData: Record<string, any> = { approvalStatus: status };
  if (status === 'rejected' && reason) {
    updateData.declineReason = reason;
  }

  console.log("update approval status data =>> ", updateData)

  const pkg = await Package.findOneAndUpdate(
    { _id: id, isDeleted: false },
    updateData,
    { new: true }
  ).populate({ path: 'authorId', select: 'name email' });

  if (pkg && status === 'approved') {
    sentNotificationForPackageApproved({
      receiverId: pkg.authorId as mongoose.Types.ObjectId,
      packageTitle: pkg.title,
    }).catch((err) => console.error('Package approved notification failed:', err));
  } else if (pkg && status === 'rejected' && reason) {

    console.log('hitted email of package declined')
    sentNotificationForPackageDeclined({
      receiverId: pkg.authorId as mongoose.Types.ObjectId,
      packageTitle: pkg.title,
      reason,
    }).catch((err) => console.error('Package declined notification failed:', err));
  }

  return pkg;
};

const declinePackageById = async (id: string, reason: string) => {
  const pkg = await Package.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true, approvalStatus: 'rejected', declineReason: reason },
    { new: true, runValidators: true }
  ).populate({ path: 'authorId', select: 'name email' });

  if (!pkg) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to decline the package or package not found');
  }

  sentNotificationForPackageDeclined({
    receiverId: pkg.authorId as mongoose.Types.ObjectId,
    packageTitle: pkg.title,
    reason,
  }).catch((err) => console.error('Package declined notification failed:', err));

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
