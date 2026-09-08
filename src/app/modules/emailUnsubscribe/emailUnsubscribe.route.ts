import { Router } from "express";
import { EmailUnsubscribeController } from "./emailUnsubscribe.controller";

const router = Router();

// No auth: these links are opened directly from a user's mail client.
router
  .get("/unsubscribe", EmailUnsubscribeController.unsubscribeViaLink)
  .post("/unsubscribe", EmailUnsubscribeController.unsubscribeOneClick);

export const EmailUnsubscribeRoutes = router;
