import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { Request, Response } from "express";
import { SubscribeService } from "./subscribe.service";
import AppError from "../../error/AppError";

const subscribeByEmail = catchAsync(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      throw new AppError(400, "Email is required");
    }

    const result = await SubscribeService.subscribeByEmail(email);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Subscription created. Please verify your email.",
      data: result,
    });
  }
);

const sentEmailToSubscribers = catchAsync(
  async (req: Request, res: Response) => {
    const { subject, message, emails } = req.body;

    const result = await SubscribeService.sentEmailToSubscribers({
      subject,
      message,
      emails,
    });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Email sent to subscribers successfully',
      data: result,
    });
  }
);

const verifySubscription = catchAsync(
  async (req: Request, res: Response) => {
    const { token } = req.query;

    if (!token) {
      throw new AppError(400, "Token is required");
    }

    const result = await SubscribeService.verifySubscription(String(token));

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Subscription verified successfully",
      data: result,
    });
  }
);

const getAllSubscribers = catchAsync(
  async (req: Request, res: Response) => {
    const subscribers = await SubscribeService.getAllSubscribers(req.query);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Subscribers fetched successfully",
      data: subscribers,
    });
  }
);

export const subscribeController = {
    subscribeByEmail,
    sentEmailToSubscribers,
    getAllSubscribers,
    verifySubscription,

}
