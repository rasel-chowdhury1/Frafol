import { Router } from "express";
import { userRoutes } from "../modules/user/user.route";
import { authRoutes } from "../modules/auth/auth.route";
import { otpRoutes } from "../modules/otp/otp.routes";
import { settingsRoutes } from "../modules/setting/setting.route";
import { notificationRoutes } from "../modules/notifications/notifications.route";
import { CategoryRoutes } from "../modules/category/category.route";
import { ReviewRoutes } from "../modules/review/review.route";
import { FeedbackRoutes } from "../modules/feedback/feedback.route";

const router = Router();

const moduleRoutes = [
  {
    path: '/users',
    route: userRoutes,
  },
  {
    path: '/auth',
    route: authRoutes,
  },
  {
    path: "/otp",
    route: otpRoutes
  },
  {
    path: "/settings",
    route: settingsRoutes
  },
  {
     path: "/notifications",
     route: notificationRoutes
  },
  {
     path: "/category",
     route: CategoryRoutes
  },
  {
     path: "/review",
     route: ReviewRoutes
  },
  {
     path: "/feedback",
     route: FeedbackRoutes
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;