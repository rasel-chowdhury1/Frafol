import { Types } from 'mongoose';
import httpStatus from 'http-status';
import { MySubscription } from './mySubscription.model';
import { User } from '../user/user.model';
import AppError from '../../error/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { sentNotificationForSubscriptionCancelledByAdmin } from '../../../socketIo';

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
    {
      isActive: false,
      cancelSource: 'user',
      cancelledAt: new Date(),
    },
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

const cancelSubscriptionByAdmin = async (
  userId: Types.ObjectId,
  adminId: Types.ObjectId,
  reason?: string,
) => {
  const subscription = await MySubscription.findOneAndUpdate(
    { userId, isActive: true },
    {
      isActive: false,
      cancelSource: 'admin',
      cancelledBy: adminId,
      cancelledAt: new Date(),
      cancelReason: reason,
    },
    { new: true },
  );

  if (!subscription) {
    throw new AppError(httpStatus.NOT_FOUND, 'No active subscription found for this user');
  }

  await User.findByIdAndUpdate(userId, {
    hasActiveSubscription: false,
  });

  // 🔔 Notify the user their subscription was cancelled
  sentNotificationForSubscriptionCancelledByAdmin({ userId, reason }).catch((err) =>
    console.error('Subscription cancelled notification failed:', err),
  );

  return subscription;
};

// 📊 Admin-facing listing for tracking subscriptions & their cancellation history
const getAllSubscriptions = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(
    MySubscription.find()
      .populate('userId', 'name email profileImage role')
      .populate('cancelledBy', 'name email'),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const [result, meta] = await Promise.all([
    queryBuilder.modelQuery,
    queryBuilder.countTotal(),
  ]);

  return { meta, result };
};

export const MySubscriptionService = {
  createSubscription,
  getMyActiveSubscription,
  cancelMySubscription,
  cancelSubscriptionByAdmin,
  getAllSubscriptions,
};
