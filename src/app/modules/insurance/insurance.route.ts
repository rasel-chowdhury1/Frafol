import { Router } from "express";
import { USER_ROLE } from "../user/user.constants";
import auth from "../../middleware/auth";
import { InsuranceController } from "./insurance.controller";

const router = Router();

// User applies for insurance
router.post(
    "/apply", 
    auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.COMPANY, USER_ROLE.BOTH), 
    InsuranceController.applyInsurance
)

// Admin sees all insurance applications
.get(
  "/all",
  auth(USER_ROLE.ADMIN),
  InsuranceController.getAllInsurance
)

// User sees their own applications
.get(
  "/my",
  auth(
    USER_ROLE.USER,
    USER_ROLE.PHOTOGRAPHER,
    USER_ROLE.VIDEOGRAPHER,
    USER_ROLE.COMPANY
  ),
  InsuranceController.getMyInsurance
);

export const InsuranceRoutes = router;
