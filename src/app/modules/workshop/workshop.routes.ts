import { Router } from "express";
import { WorkshopController } from "./workshop.controller";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constants";
import fileUpload from "../../middleware/fileUpload";
import parseData from "../../middleware/parseData";
const upload = fileUpload('./public/uploads/workshop');

const router = Router();

router
  .post(
    "/add",
    auth(
      USER_ROLE.USER,
      USER_ROLE.COMPANY,
      USER_ROLE.PHOTOGRAPHER,
      USER_ROLE.VIDEOGRAPHER,
      USER_ROLE.BOTH,
      USER_ROLE.ADMIN
    ),
    upload.single('image'),
    parseData(),
    WorkshopController.createWorkshop
  )

  .get("/", WorkshopController.getAllWorkshops)

  .get(
    "/my",
    auth(USER_ROLE.USER, USER_ROLE.COMPANY, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH),
    WorkshopController.getMyWorkshops
  )

  .get(
    "/pending",
    auth(USER_ROLE.ADMIN),
    WorkshopController.getPendingWorkshops
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
    WorkshopController.getWorkshopById
  )

  .patch(
    "/update/:id",
    auth(
      USER_ROLE.USER,
      USER_ROLE.COMPANY,
      USER_ROLE.PHOTOGRAPHER,
      USER_ROLE.VIDEOGRAPHER,
      USER_ROLE.BOTH,
      USER_ROLE.ADMIN
    ),
    upload.single('image'),
    parseData(),
    WorkshopController.updateWorkshop
  )

  .patch(
    "/updateApprovalStatus/:id",
    auth(USER_ROLE.ADMIN),
    WorkshopController.updateApprovalStatusByAdmin
    )

  .patch(
    "/decline/:id",
    auth(USER_ROLE.ADMIN),
    WorkshopController.declineWorkshopById
    )

  .delete(
    "/:id",
    auth(
      USER_ROLE.USER,
      USER_ROLE.COMPANY,
      USER_ROLE.PHOTOGRAPHER,
      USER_ROLE.VIDEOGRAPHER,
      USER_ROLE.BOTH,
      USER_ROLE.ADMIN
    ),
    WorkshopController.deleteWorkshop
  );

export const WorkshopRoutes = router;
