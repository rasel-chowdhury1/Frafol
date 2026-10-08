import { Router } from "express";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constants";
import { EmailTestController } from "./emailTest.controller";

const router = Router();

// Admin-only: fires a real email with dummy data so templates can be
// visually checked in an inbox. e.g. GET /api/v1/email-test/event-order-invoice?to=you@example.com
router
  .get(
    "/event-order-invoice",
    // auth(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    EmailTestController.testEventOrderInvoice
  )
  .get(
    "/gear-order-invoice",
    // auth(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    EmailTestController.testGearOrderInvoice
  )
  .get(
    "/workshop-invoice",
    // auth(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    EmailTestController.testWorkshopInvoice
  );

export const EmailTestRoutes = router;
