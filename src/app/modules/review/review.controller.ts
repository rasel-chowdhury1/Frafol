import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ReviewService } from "./review.service";
import { IUpdateReview } from "./review.interface";

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

const getAllReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.getAllReviews();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Reviews retrieved successfully",
    data: result,
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
  const result = await ReviewService.updateReview(req.params.id, payload, req.user.userId);
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
  getAllReviews,
  getReviewsByServiceProvider,
  getReviewById: ReviewService.getReviewById,
  updateReview,
  deleteReview,
};
