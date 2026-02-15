import { Router } from "express";
import { PackageController } from "./package.controller";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constants";
import fileUpload from "../../middleware/fileUpload";
import parseData from "../../middleware/parseData";

const upload = fileUpload("./public/uploads/package");
const router = Router();

router
  .post(
    "/add",
    auth(
      USER_ROLE.USER,
      USER_ROLE.PHOTOGRAPHER,
      USER_ROLE.VIDEOGRAPHER,
      USER_ROLE.BOTH,
      USER_ROLE.COMPANY,
      USER_ROLE.ADMIN,
    ),
    upload.single("image"),
    parseData(),
    PackageController.createPackage
  )

  .get("/", PackageController.getAllPackages)

  .get(
    "/my",
    auth(
      USER_ROLE.USER, 
      USER_ROLE.COMPANY,
      USER_ROLE.PHOTOGRAPHER,
      USER_ROLE.VIDEOGRAPHER,
      USER_ROLE.BOTH, 
      USER_ROLE.ADMIN),
    PackageController.getMyPackages
  )

  .get(
    "/pending",
    auth(USER_ROLE.ADMIN),
    PackageController.getPendingPackages
  )

  .get(
    "/stats/:userId",
    PackageController.getUserPackageAndReviewStats
  )

  .get(
    "/:id",
    auth(
      USER_ROLE.USER,
      USER_ROLE.COMPANY,
      USER_ROLE.PHOTOGRAPHER,
      USER_ROLE.VIDEOGRAPHER,
      USER_ROLE.BOTH,
      USER_ROLE.ADMIN
    ),
    PackageController.getPackageById
  )

  .patch(
    "/update/:id",
    auth(
      USER_ROLE.USER, 
      USER_ROLE.COMPANY, 
      USER_ROLE.PHOTOGRAPHER,
      USER_ROLE.VIDEOGRAPHER,
      USER_ROLE.BOTH,
      USER_ROLE.ADMIN),
    upload.single("image"),
    parseData(),
    PackageController.updatePackage
  )

  .patch(
    "/updateApprovalStatus/:id",
    auth(USER_ROLE.ADMIN),
    PackageController.updateApprovalStatusByAdmin
  )

  .patch(
    "/decline/:id",
    auth(USER_ROLE.ADMIN),
    PackageController.declinePackageById
  )

  .delete(
    "/:id",
    auth(
      USER_ROLE.USER, 
      USER_ROLE.COMPANY, 
      USER_ROLE.PHOTOGRAPHER,
      USER_ROLE.VIDEOGRAPHER,
      USER_ROLE.BOTH,
      USER_ROLE.ADMIN),
    PackageController.deletePackage
  );

export const PackageRoutes = router;
