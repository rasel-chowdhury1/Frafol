

import { Router } from "express";
import { CommunityController } from "./community.controller";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constants";
import fileUpload from "../../middleware/fileUpload";
import parseData from "../../middleware/parseData";
const upload = fileUpload('./public/uploads/community');

const router = Router();

// User routes
router
    .post(
    "/create",
    auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER,USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN),
    upload.fields([
          { name: 'images', maxCount: 10 },
      ]),
    parseData(),
    CommunityController.createCommunity
    )

  .get(
    "/",
    auth(USER_ROLE.USER,USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER,USER_ROLE.BOTH),
    CommunityController.getAllApproved
    )

  .get(
    "/pending",
    CommunityController.getPendingCommunities
  )

  .get(
    "/my",
    auth(USER_ROLE.USER,USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER,USER_ROLE.BOTH),
    CommunityController.getMyPosts
    )

  // Admin routes
  .get(
    "/admin",
    auth(USER_ROLE.ADMIN, USER_ROLE.USER),
    CommunityController.adminGetAll
    )

   .get(
    "/comments/:id",
    auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.USER, USER_ROLE.ADMIN),
    CommunityController.getCommentsById
   )

   
   .get(
    "/:id",
    auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.USER, USER_ROLE.ADMIN),
    CommunityController.getCommunityDetails
   )

   .patch(
      "/update/:id",
      auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.USER, USER_ROLE.ADMIN),
      upload.fields([
          { name: 'images', maxCount: 10 },
      ]),
      parseData(),
      CommunityController.updateCommunity
      )

  .patch(
    "/approve/:id",
    auth("admin"), 
    CommunityController.approveCommunity
    )

  .patch(
    "/reject/:id",
    auth("admin"), 
    CommunityController.rejectCommunity
    )

  .delete(
    "/:id",
    auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.USER, USER_ROLE.ADMIN),
    CommunityController.deleteCommunity
    );

export const CommunityRoutes = router;
