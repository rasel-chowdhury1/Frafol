import { Request, Response } from 'express';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { MySubscriptionService } from './mySubscription.service';

const createMySubscription = async (req: Request, res: Response) => {
  const userId = req.user._id;
  const { paymentId, howManyDays } = req.body;

  const result = await MySubscriptionService.createSubscription({
    userId,
    paymentId,
    howManyDays,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Subscription activated successfully',
    data: result,
  });
};

const getMySubscription = async (req: Request, res: Response) => {
  const userId = req.user._id;

  const result =
    await MySubscriptionService.getMyActiveSubscription(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My active subscription',
    data: result,
  });
};

const cancelSubscription = async (req: Request, res: Response) => {
  const userId = req.user._id;

  const result =
    await MySubscriptionService.cancelMySubscription(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subscription cancelled successfully',
    data: result,
  });
};

export const MySubscriptionController = {
  createMySubscription,
  getMySubscription,
  cancelSubscription,
};
