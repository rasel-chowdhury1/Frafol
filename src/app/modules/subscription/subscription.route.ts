import express from "express";
import { SubscriptionController } from "./subscription.controller";
import { USER_ROLE } from "../user/user.constants";
import auth from "../../middleware/auth";

const router = express.Router();

router.get("/", SubscriptionController.getAllSubscriptions);

router.patch(
  "/update/:id",
  auth(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
  SubscriptionController.updateSubscriptionPrice
);

export const SubscriptionRoutes = router;
