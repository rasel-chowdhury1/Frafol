import express from "express";
import { subscribeController } from "./subscribe.controller";


const router = express.Router();

router.post("/", subscribeController.subscribeByEmail);
router.get("/verify", subscribeController.verifySubscription);

// Admin only — add auth middleware if needed
router.get("/", subscribeController.getAllSubscribers);

export const SubscribeRoutes = router;
