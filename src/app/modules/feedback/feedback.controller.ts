import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { FeedbackService } from "./feedback.service";

const createFeedback = catchAsync(async (req: Request, res: Response) => {
  req.body.userId = req.user.userId; // logged-in user
  const result = await FeedbackService.createFeedback(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Feedback created successfully",
    data: result,
  });
});

const getAllFeedbacks = catchAsync(async (req: Request, res: Response) => {
  const result = await FeedbackService.getAllFeedbacks(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Feedbacks retrieved successfully",
    data: result,
  });
});

const getFeedbackById = catchAsync(async (req: Request, res: Response) => {
  const result = await FeedbackService.getFeedbackById(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Feedback retrieved successfully",
    data: result,
  });
});

const updateFeedback = catchAsync(async (req: Request, res: Response) => {
  const result = await FeedbackService.updateFeedback(req.params.id, req.user.userId, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Feedback updated successfully",
    data: result,
  });
});

const deleteFeedback = catchAsync(async (req: Request, res: Response) => {
  const result = await FeedbackService.deleteFeedback(req.params.id, req.user.userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Feedback deleted successfully",
    data: null,
  });
});

export const FeedbackController = {
  createFeedback,
  getAllFeedbacks,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
};
