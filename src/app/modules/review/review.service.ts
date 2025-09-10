import { Review } from "./review.model";
import { IReview, IUpdateReview } from "./review.interface";
import { User } from "../user/user.models";

const createReview = async (payload: IReview) => {
  // 1. Create the review
  const review = await Review.create(payload);

  // 2. Update service provider stats
  const serviceProvider = await User.findById(payload.serviceProviderId);

  if (serviceProvider) {

    // Increment total reviews
    serviceProvider.totalReview += 1;

    // Calculate new average rating
    serviceProvider.averageRating =
      (serviceProvider.averageRating * (serviceProvider.totalReview - 1) + payload.rating) /
      serviceProvider.totalReview;

    await serviceProvider.save();
  }

  return review;
};

const getAllReviews = async () => {
  return await Review.find({isDeleted: false});
};

const getReviewsByServiceProvider = async (serviceProviderId: string) => {
  return await Review.find({ serviceProviderId }).populate("userId", "name email");
};

const getReviewById = async (id: string) => {
  return await Review.findById(id);
};

const updateReview = async (id: string, payload: IUpdateReview, userId: string) => {
  const review = await Review.findOne({ _id: id, userId });
  if (!review) throw new Error("Not authorized or review not found");

  const oldRating = review.rating;
  Object.assign(review, payload);
  await review.save();

  // Update average rating for service provider if rating changed
  if (payload.rating !== undefined && payload.rating !== oldRating) {
    const reviews = await Review.find({ serviceProviderId: review.serviceProviderId });
    const totalReview = reviews.length;
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReview;

    await User.findByIdAndUpdate(review.serviceProviderId, {
      totalReview,
      averageRating,
    });
  }

  return review;
};

const deleteReview = async (id: string, userId: string) => {
  const review = await Review.findOne({ _id: id, userId });

  if (!review) {
    throw new Error("You are not authorized to delete this review or it does not exist.");
  }

  review.isDeleted = true;
  return await review.save();
};

export const ReviewService = {
  createReview,
  getAllReviews,
  getReviewsByServiceProvider,
  getReviewById,
  updateReview,
  deleteReview,
};
