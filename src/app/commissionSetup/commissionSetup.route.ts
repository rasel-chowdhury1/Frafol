import { Router } from "express";
import { CommissionSetupController } from "./commissionSetup.controller";
import { USER_ROLE } from "../modules/user/user.constants";
import auth from "../middleware/auth";

const router = Router();

router
  .post(
    "/",
    auth(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    CommissionSetupController.createOrUpdateCommission
  )
  .get(
    "/",
    CommissionSetupController.getCommission
  )
  .patch(
    "/update",
    auth(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    CommissionSetupController.updateCommission
  );

export const CommissionSetupRoutes = router;
