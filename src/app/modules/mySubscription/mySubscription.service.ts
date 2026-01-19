import { Types } from 'mongoose';
import httpStatus from 'http-status';
import { MySubscription } from './mySubscription.model';
import { User } from '../user/user.model';
import AppError from '../../error/AppError';

const createSubscription = async (payload: {
  userId: Types.ObjectId;
  paymentId: Types.ObjectId;
  howManyDays: number;
}) => {
  const { userId, paymentId, howManyDays } = payload;

  const startDate = new Date();
  const expireDate = new Date(
    startDate.getTime() + howManyDays * 24 * 60 * 60 * 1000,
  );

  // deactivate previous subscription
  await MySubscription.updateMany(
    { userId, isActive: true },
    { isActive: false },
  );

  const subscription = await MySubscription.create({
    userId,
    paymentId,
    howManyDays,
    startDate,
    expireDate,
    isActive: true,
  });

  // 🔥 update user optimization flag
  await User.findByIdAndUpdate(userId, {
    hasActiveSubscription: true,
  });

  return subscription;
};

const getMyActiveSubscription = async (userId: Types.ObjectId) => {
  const subscription = await MySubscription.findOne({
    userId,
    isActive: true,
    expireDate: { $gt: new Date() },
  });

  return subscription;
};

const cancelMySubscription = async (userId: Types.ObjectId) => {
  const subscription = await MySubscription.findOneAndUpdate(
    { userId, isActive: true },
    { isActive: false },
    { new: true },
  );

  if (!subscription) {
    throw new AppError(httpStatus.NOT_FOUND, 'No active subscription found');
  }

  await User.findByIdAndUpdate(userId, {
    hasActiveSubscription: false,
  });

  return subscription;
};

export const MySubscriptionService = {
  createSubscription,
  getMyActiveSubscription,
  cancelMySubscription,
};
