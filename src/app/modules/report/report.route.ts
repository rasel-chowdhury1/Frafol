import { Router } from "express";
import { ReportController } from "./report.controller";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constants";
import fileUpload from "../../middleware/fileUpload";
import parseData from "../../middleware/parseData";
const upload = fileUpload('./public/uploads/report');


const router = Router();

router.post(
  "/add",
  // auth(
  //   USER_ROLE.USER,
  //   USER_ROLE.COMPANY,
  //   USER_ROLE.PHOTOGRAPHER,
  //   USER_ROLE.VIDEOGRAPHER,
  //   USER_ROLE.BOTH,
  //   USER_ROLE.ADMIN
  // ),
  upload.single('image'),
  parseData(),
  ReportController.createReport
);

router.get(
  "/",
  auth(USER_ROLE.ADMIN), // only admin can see all reports
  ReportController.getAllReports
);

router.get(
  "/:id",
  auth(
    USER_ROLE.USER,
    USER_ROLE.COMPANY,
    USER_ROLE.PHOTOGRAPHER,
    USER_ROLE.VIDEOGRAPHER,
    USER_ROLE.BOTH,
    USER_ROLE.ADMIN
  ),
  ReportController.getReportById
);

router.patch(
  "/update/:id",
  auth(USER_ROLE.ADMIN), // only admin can update reports
  ReportController.updateReport
);

router.delete(
  "/:id",
  auth(USER_ROLE.ADMIN), // only admin can delete reports
  ReportController.deleteReport
);

export const ReportRoutes = router;
