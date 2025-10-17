import { Router } from "express";
import { CommunityController } from "./community.controller";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constants";
import fileUpload from "../../middleware/fileUpload";
import parseData from "../../middleware/parseData";
const upload = fileUpload('./public/uploads/community');

const router = Router();

router.post(
  "/add",
  auth(USER_ROLE.USER, USER_ROLE.ADMIN),
  upload.fields([
        { name: 'images', maxCount: 10 },
    ]),
    parseData(),
  CommunityController.createCommunity
)

.get(
    "/", 
    CommunityController.getAllCommunities
)

.get(
    "/:id", 
    CommunityController.getCommunityById
)

.patch(
  "/update/:id",
  auth(USER_ROLE.USER, USER_ROLE.ADMIN),
  CommunityController.updateCommunity
)

.delete(
  "/:id",
  auth(USER_ROLE.USER, USER_ROLE.ADMIN),
  CommunityController.deleteCommunity
);

export const CommunityRoutes = router;
