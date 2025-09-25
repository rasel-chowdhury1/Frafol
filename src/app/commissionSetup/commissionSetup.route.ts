import { Router } from "express";
import { CommissionSetupController } from "./commissionSetup.controller";
import { USER_ROLE } from "../modules/user/user.constants";
import auth from "../middleware/auth";

const router = Router();

router
  .post(
    "/",
    auth(USER_ROLE.ADMIN),
    CommissionSetupController.createOrUpdateCommission
  )
  .get(
    "/",
    // auth(USER_ROLE.ADMIN),
    CommissionSetupController.getCommission
  )
  .patch(
    "/update",
    auth(USER_ROLE.ADMIN),
    CommissionSetupController.updateCommission
  );

export const CommissionSetupRoutes = router;
