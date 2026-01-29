import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import { SubscriptionService } from "./subscription.service";

const getAllSubscriptions = catchAsync(async (_req: Request, res: Response) => {
  const result = await SubscriptionService.getAllSubscriptions();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subscriptions retrieved successfully",
    data: result,
  });
});

const updateSubscriptionPrice = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { price } = req.body;

  const result = await SubscriptionService.updateSubscriptionPrice(id, price);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subscription price updated successfully",
    data: result,
  });
});

export const SubscriptionController = {
  getAllSubscriptions,
  updateSubscriptionPrice,
};
