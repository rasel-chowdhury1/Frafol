import { Router } from "express";
import { GearMarketplaceController } from "./gearMarketplace.controller";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constants";
import fileUpload from "../../middleware/fileUpload";
import parseData from "../../middleware/parseData";
const upload = fileUpload('./public/uploads/marketPlace');

const router = Router();

router
    .post(
    "/add",
    auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.COMPANY),
    upload.fields([
      { name: 'gallery', maxCount: 10 },
    ]),
    parseData(),
    GearMarketplaceController.createGearMarketplace
    )

    .get(
    "/",
    GearMarketplaceController.getAllGearMarketplaces
    )


    .get(
        "/my",
        auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.COMPANY),
        GearMarketplaceController.getMyGearMarketplaces
    )

    .get(
        "/pending",
        auth(USER_ROLE.ADMIN),
        GearMarketplaceController.getPendingGearMarketplace
    )

    .get(
        "/decline/:id",
        auth(USER_ROLE.ADMIN),
        GearMarketplaceController.declineGearById
    )


      .get(
      "/:id",
      GearMarketplaceController.getGearMarketplaceById
      )

      .patch(
      "/update/:id",
      auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN, USER_ROLE.COMPANY),
      upload.fields([
        { name: 'gallery', maxCount: 10 },
      ]),
      parseData(),
      GearMarketplaceController.updateGearMarketplace
      )


      .patch(
      "/updateApprovalStatus/:id",
      auth(USER_ROLE.ADMIN),
      GearMarketplaceController.updateApprovalStatusByAdmin
      )



      .delete(
      "/:id",
      auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN, USER_ROLE.COMPANY),
      GearMarketplaceController.deleteGearMarketplace
      );

export const GearMarketplaceRoutes = router;
