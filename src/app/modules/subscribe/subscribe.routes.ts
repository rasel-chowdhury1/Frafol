import express from "express";
import { subscribeController } from "./subscribe.controller";


const router = express.Router();

router.post("/", subscribeController.subscribeByEmail)

.post(
    "/send-email",
    subscribeController.sentEmailToSubscribers
)

.get("/verify", subscribeController.verifySubscription)

// Admin only — add auth middleware if needed
.get("/", subscribeController.getAllSubscribers)

export const SubscribeRoutes = router;
