import { Router } from "express";
import { CommunityEngagementController } from "./communityEngagementStats.controller";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constants";

const router = Router();

router
.post(
    "/like/:id", 
    auth(USER_ROLE.USER,USER_ROLE.PHOTOGRAPHER,USER_ROLE.VIDEOGRAPHER,USER_ROLE.BOTH, USER_ROLE.ADMIN), 
    CommunityEngagementController.likeCommunity
)


.post(
    "/unlike/:id", 
    auth(USER_ROLE.USER,USER_ROLE.PHOTOGRAPHER,USER_ROLE.VIDEOGRAPHER,USER_ROLE.BOTH, USER_ROLE.ADMIN), 
    CommunityEngagementController.unlikeCommunity
)


.post(
    "/comment/:id", 
    auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER,USER_ROLE.VIDEOGRAPHER,USER_ROLE.BOTH, USER_ROLE.ADMIN), 
    CommunityEngagementController.addComment
)

.post(
    "/comment-reply/:commentId", 
    auth(USER_ROLE.USER,USER_ROLE.PHOTOGRAPHER,USER_ROLE.VIDEOGRAPHER,USER_ROLE.BOTH, USER_ROLE.ADMIN),  
    CommunityEngagementController.addReply
)

.post(
    "/:id/view", 
    auth(USER_ROLE.USER, USER_ROLE.ADMIN), 
    CommunityEngagementController.addViewer
)

export const CommunityEngagementRoutes = router;
