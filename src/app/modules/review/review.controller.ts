import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ReviewService } from "./review.service";
import { IUpdateReview } from "./review.interface";
import httpStatus from "http-status";

const createReview = catchAsync(async (req: Request, res: Response) => {
  req.body.userId = req.user.userId;
  const result = await ReviewService.createReview(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Review created successfully",
    data: result,
  });
});


const completePendingReview = catchAsync(async (req, res) => {
  const { reviewId } = req.params;
  const {userId} = req.user; // assuming userId is stored in req.user
  const payload = req.body; // { rating: number, message: string }

  const updatedReview = await ReviewService.completePendingReview(reviewId, userId, payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Review submitted successfully",
    data: updatedReview,
  });
});

const myReviewStats = catchAsync(async (req, res) => {
  const {userId} = req.user; // assuming you get logged-in user ID from auth middleware

  const stats = await ReviewService.getMyReviewStats(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Review stats fetched successfully",
    data: stats,
  });
});

const getAllReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.getAllReviews();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Reviews retrieved successfully",
    data: result,
  });
});

const getMyReviews = catchAsync(async (req, res) => {
  const userId = req.user.userId; // from auth middleware

  const result = await ReviewService.getMyReviews(
    userId,
    req.query
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "My reviews retrieved successfully",
    data: result,
  });
});

const getMyPendingReviews = catchAsync(async (req, res) => {
  const {userId} = req.user; 

  const result = await ReviewService.getMyPendingReviews(userId, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Pending reviews retrieved successfully",
    meta: result.meta,
    data: result.result,
  });
});

const getReviewsByServiceProvider = catchAsync(async (req: Request, res: Response) => {
  const { serviceProviderId } = req.params;
  console.log("serviceProviderId =>> ",serviceProviderId)
  const result = await ReviewService.getReviewsByServiceProvider(serviceProviderId, req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Service provider reviews retrieved successfully",
    data: result,
  });
});

const updateReview = catchAsync(async (req: Request, res: Response) => {
  const payload: IUpdateReview = req.body;

  const result = await ReviewService.updateReview(req.params.id, req.user.userId,  payload);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Review updated successfully",
    data: result,
  });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  await ReviewService.deleteReview(req.params.id, req.user.userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Review deleted successfully",
    data: null,
  });
});

export const ReviewController = {
  createReview,
  completePendingReview,
  myReviewStats,
  getAllReviews,
  getMyReviews,
  getMyPendingReviews,
  getReviewsByServiceProvider,
  getReviewById: ReviewService.getReviewById,
  updateReview,
  deleteReview,
};
