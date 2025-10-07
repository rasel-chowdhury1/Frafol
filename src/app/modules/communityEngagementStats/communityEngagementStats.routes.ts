import { Router } from "express";
import { CommunityEngagementController } from "./communityEngagementStats.controller";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constants";

const router = Router();

router
.post(
    "/:id/like", 
    auth(USER_ROLE.USER, USER_ROLE.ADMIN), 
    CommunityEngagementController.likeCommunity
)


.post(
    "/:id/unlike", 
    auth(USER_ROLE.USER, USER_ROLE.ADMIN), 
    CommunityEngagementController.unlikeCommunity
)


.post(
    "/:id/comment", 
    auth(USER_ROLE.USER, USER_ROLE.ADMIN), 
    CommunityEngagementController.addComment
)

.post(
    "/:id/comment/:commentId/reply", 
    auth(USER_ROLE.USER, USER_ROLE.ADMIN), 
    CommunityEngagementController.addReply
)

.post(
    "/:id/view", 
    auth(USER_ROLE.USER, USER_ROLE.ADMIN), 
    CommunityEngagementController.addViewer
)

export const CommunityEngagementRoutes = router;
