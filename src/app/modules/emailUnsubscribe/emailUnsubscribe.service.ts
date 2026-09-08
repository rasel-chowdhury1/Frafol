import httpStatus from "http-status";
import { createToken, verifyToken } from "../../utils/tokenManage";
import config from "../../config";
import AppError from "../../error/AppError";
import { User } from "../user/user.model";

const UNSUBSCRIBE_PURPOSE = "notification-email-unsubscribe";

const generateUnsubscribeToken = (userId: string): string => {
  return createToken({
    payload: { userId, purpose: UNSUBSCRIBE_PURPOSE },
    access_secret: config.jwt_access_secret as string,
    expity_time: "3650d",
  });
};

const getUnsubscribeUrl = (userId: string): string => {
  const token = generateUnsubscribeToken(userId);
  return `${config.BACKEND_URL}/api/v1/email/unsubscribe?token=${token}`;
};

const unsubscribeFromNotificationEmails = async (token: string) => {
  if (!token) {
    throw new AppError(httpStatus.BAD_REQUEST, "Unsubscribe token is required");
  }

  const decoded = verifyToken({
    token,
    access_secret: config.jwt_access_secret as string,
  });

  if (decoded.purpose !== UNSUBSCRIBE_PURPOSE || !decoded.userId) {
    throw new AppError(httpStatus.FORBIDDEN, "Invalid unsubscribe token");
  }

  const user = await User.findByIdAndUpdate(
    decoded.userId,
    { emailNotificationsEnabled: false },
    { new: true },
  ).select("email emailNotificationsEnabled");

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  return user;
};

export const EmailUnsubscribeService = {
  generateUnsubscribeToken,
  getUnsubscribeUrl,
  unsubscribeFromNotificationEmails,
};
