import { Router } from "express";
import { userRoutes } from "../modules/user/user.route";
import { authRoutes } from "../modules/auth/auth.route";
import { otpRoutes } from "../modules/otp/otp.routes";
import { settingsRoutes } from "../modules/setting/setting.route";
import { notificationRoutes } from "../modules/notifications/notifications.route";
import { CategoryRoutes } from "../modules/category/category.route";
import { ReviewRoutes } from "../modules/review/review.route";
import { FeedbackRoutes } from "../modules/feedback/feedback.route";
import { GearMarketplaceRoutes } from "../modules/gearMarketplace/gearMarketplace.route";
import { CommissionSetupRoutes } from "../commissionSetup/commissionSetup.route";
import { ReportRoutes } from "../modules/report/report.route";
import { WorkshopRoutes } from "../modules/workshop/workshop.routes";
import { PackageRoutes } from "../modules/package/package.route";
import { EventOrderRoutes } from "../modules/eventOrder/eventOrder.route";
import { PaymentRoutes } from "../modules/payment/payment.route";
import { GearOrderRoutes } from "../modules/gearOrder/gearOrder.route";
import { CommunityRoutes } from "../modules/community/community.routes";
import { CommunityEngagementRoutes } from "../modules/communityEngagementStats/communityEngagementStats.routes";
import { ChatRoutes } from "../modules/chat/chat.route";
import { messageRoutes } from "../modules/message/message.route";

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
  {
     path: "/marketPlace",
     route: GearMarketplaceRoutes
  },
  {
     path: "/workshop",
     route: WorkshopRoutes
  },
  {
   path : "/package",
   route : PackageRoutes
  },
  {
     path: "/commissionSetup",
     route: CommissionSetupRoutes
  },
  {
     path: "/report",
     route: ReportRoutes
  },
   {
      path: '/event-order',
      route: EventOrderRoutes
   },
   {
      path: '/gear-order',
      route: GearOrderRoutes
   },
   {
      path: '/payment',
      route: PaymentRoutes
   },

   {
   path: "/community",
   route: CommunityRoutes
   },
   {
   path: "/community-engagement",
   route: CommunityEngagementRoutes
   },
   {
   path: "/chat",
   route: ChatRoutes
   },
   {
   path: "/message",
   route: messageRoutes
   },

];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;