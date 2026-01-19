import { Review } from './review.model';
import { GetReviewsQuery, IReview, IUpdateReview } from './review.interface';
import { User } from '../user/user.model';
import mongoose from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';
import { EventOrder } from '../eventOrder/eventOrder.model';
import AppError from '../../error/AppError';
import status from 'http-status';

const createReview = async (payload: IReview) => {
  console.log('review payload===>> ', payload);
  // 1. Create the review
  const review = await Review.create(payload);

  // 2. Update service provider stats
  const serviceProvider = await User.findById(payload.serviceProviderId);

  if (serviceProvider) {
    // Increment total reviews
    serviceProvider.totalReview += 1;

    // Calculate new average rating
    serviceProvider.averageRating =
      (serviceProvider.averageRating * (serviceProvider.totalReview - 1) +
        payload.rating) /
      serviceProvider.totalReview;

    await serviceProvider.save();
  }

  return review;
};

const completePendingReview = async (
  reviewId: string,
  userId: string,
  payload: { rating: number; message: string; isAnonymous: boolean },
) => {
  // 1️⃣ Find the review
  const review = await Review.findById(reviewId);

  if (!review) {
    throw new AppError(404, 'Review not found');
  }

  // 2️⃣ Check if the current user is the owner of the review
  if (review.userId.toString() !== userId) {
    throw new AppError(403, 'You are not authorized to update this review');
  }

  // 3️⃣ Check if the corresponding event order exists
  const eventOrder = await EventOrder.findById(review.eventOrderId);

  if (!eventOrder) {
    throw new AppError(404, 'Event order not found');
  }

  // 4️⃣ Only allow review completion if order is delivered
  if (eventOrder.status !== 'delivered') {
    throw new AppError(
      400,
      'You can complete the review only after the order is delivered',
    );
  }

  // 5️⃣ Update review
  review.rating = payload.rating;
  review.message = payload.message;
  review.status = 'done';
  review.isAnonymous = payload.isAnonymous;
  await review.save();

  // 6️⃣ Update service provider stats using incremental logic
  const serviceProvider = await User.findById(review.serviceProviderId);

  if (serviceProvider) {
    // Recalculate average rating
    const allReviews = await Review.find({
      serviceProviderId: serviceProvider._id,
      status: 'done',
      isDeleted: { $ne: true },
    });

    const totalReviews = allReviews.length;
    const avgRating =
      totalReviews > 0
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    serviceProvider.totalReview = totalReviews;
    serviceProvider.averageRating = avgRating;

    await serviceProvider.save();
  }

  return review;
};

const updateReview = async (
  reviewId: string,
  userId: string,
  payload: { rating?: number; message?: string; isAnonymous?: boolean },
) => {
  // 1️⃣ Find the review
  const review = await Review.findById(reviewId);

  if (!review) {
    throw new AppError(404, 'Review not found');
  }

  // 2️⃣ Check if the current user is the owner of the review
  if (review.userId.toString() !== userId) {
    throw new AppError(403, 'You are not authorized to update this review');
  }

  // 3️⃣ Only allow updates if the review status is "done"
  if (review.status !== 'done') {
    throw new AppError(400, 'Only completed reviews can be updated');
  }

  // 4️⃣ Update review fields if provided
  if (payload.rating !== undefined) review.rating = payload.rating;
  if (payload.message !== undefined) review.message = payload.message;
  if (payload.isAnonymous !== undefined)
    review.isAnonymous = payload.isAnonymous;

  await review.save();

  // 5️⃣ Update service provider stats if rating changed
  if (payload.rating !== undefined) {
    const serviceProvider = await User.findById(review.serviceProviderId);

    if (serviceProvider) {
      // Recalculate average rating
      const allReviews = await Review.find({
        serviceProviderId: serviceProvider._id,
        status: 'done',
        isDeleted: { $ne: true },
      });

      const totalReviews = allReviews.length;
      const avgRating =
        totalReviews > 0
          ? allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
          : 0;

      serviceProvider.totalReview = totalReviews;
      serviceProvider.averageRating = avgRating;

      await serviceProvider.save();
    }
  }

  return review;
};

const getMyReviewStats = async (userId: string) => {
  if (!userId) {
    throw new AppError(400, 'User ID is required');
  }

  const objectId = new mongoose.Types.ObjectId(userId); // ✅ convert string to ObjectId

  const stats = await Review.aggregate([
    { $match: { userId: objectId, isDeleted: { $ne: true } } },
    {
      $group: {
        _id: null,
        totalReviews: {
          $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] },
        },
        pendingReviews: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
        },
      },
    },
  ]);

  return {
    totalReviews: stats[0]?.totalReviews || 0,
    pendingReviews: stats[0]?.pendingReviews || 0,
  };
};

const getAllReviews = async () => {
  return await Review.find({ isDeleted: false });
};

const getMyReviews = async (userId: string, query: Record<string, unknown>) => {
  // Base filter: reviews for this service provider
  const filter = {
    userId,
    status: 'done',
    isDeleted: { $ne: true },
  };

  // Build query with QueryBuilder
  const reviewQuery = new QueryBuilder(
    Review.find(filter)
      .populate({
        path: 'userId',
        select: 'name sureName email profileImage',
      })
      .populate({
        path: 'serviceProviderId',
        select: 'name sureName profileImage',
      })
      .populate({
        path: 'eventOrderId',
        select:
          'orderId orderType serviceType date location totalPrice packageId statusTimestamps',
        populate: {
          path: 'packageId',
          select: 'title',
        },
      }),
    query,
  )
    .search(['message']) // admin/professional can search by review message
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await reviewQuery.modelQuery;
  const meta = await reviewQuery.countTotal();

  return { meta, result };
};

const getMyPendingReviews = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  // Filter only pending reviews of this user
  const filter = {
    userId,
    status: 'pending',
    isDeleted: { $ne: true },
  };

  // QueryBuilder with populate
  const reviewQuery = new QueryBuilder(
    Review.find(filter)
      .populate({
        path: 'userId',
        select: 'name sureName email profileImage',
      })
      .populate({
        path: 'serviceProviderId',
        select: 'name sureName profileImage',
      })
      .populate({
        path: 'eventOrderId',
        select:
          'orderId orderType serviceType date location totalPrice packageId statusTimestamps',
        populate: {
          path: 'packageId',
          select: 'title',
        },
      }),
    query,
  )
    .search(['message'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await reviewQuery.modelQuery;
  const meta = await reviewQuery.countTotal();

  return { meta, result };
};

const getReviewsByServiceProvider = async (
  serviceProviderId: string,
  query?: GetReviewsQuery, // optional
) => {
  if (!serviceProviderId) {
    throw new AppError(400, 'User ID is required');
  }

  const objectId = new mongoose.Types.ObjectId(serviceProviderId); // ✅ convert string to ObjectId

  // 1️⃣ Base filter
  const baseFilter: any = {
    serviceProviderId: objectId,
    status: 'done',
    isDeleted: false,
  };

  // 2️⃣ Safely destructure with default
  const { rating, ...restQuery } = query || {};

  // 3️⃣ Safely convert rating to number if provided
  const numericRating = rating !== undefined ? Number(rating) : undefined;

  if (numericRating && [1, 2, 3, 4, 5].includes(numericRating)) {
    baseFilter.rating = numericRating;
  }

  // 4️⃣ Initialize QueryBuilder
  const reviewQuery = new QueryBuilder(
    Review.find(baseFilter).populate('userId', 'name email profileImage'),
    restQuery || {},
  )
    .paginate()
    .fields(); // optionally add .search(["message"])

  // 5️⃣ Handle sorting safely
  const sortOption = query?.sort || 'newest';

  if (sortOption === 'newest') {
    reviewQuery.modelQuery = reviewQuery.modelQuery.sort({ createdAt: -1 });
  } else if (sortOption === 'oldest') {
    reviewQuery.modelQuery = reviewQuery.modelQuery.sort({ createdAt: 1 });
  } else {
    reviewQuery.modelQuery = reviewQuery.modelQuery.sort({ createdAt: -1 }); // default
  }

  // 6️⃣ Execute query
  const reviews = await reviewQuery.modelQuery;
  const meta = await reviewQuery.countTotal();

  return { meta, reviews };
};

const getReviewById = async (id: string) => {
  return await Review.findById(id);
};

const deleteReview = async (id: string, userId: string) => {
  const review = await Review.findOne({ _id: id, userId });

  if (!review) {
    throw new Error(
      'You are not authorized to delete this review or it does not exist.',
    );
  }

  review.isDeleted = true;
  return await review.save();
};

export const ReviewService = {
  createReview,
  completePendingReview,
  updateReview,
  getMyReviewStats,
  getAllReviews,
  getMyReviews,
  getMyPendingReviews,
  getReviewsByServiceProvider,
  getReviewById,
  deleteReview,
};
