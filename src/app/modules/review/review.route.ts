import { Router } from "express";
import { ReviewController } from "./review.controller";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constants";

const router = Router();

router
    .post(
        "/add", 
        auth(USER_ROLE.USER, USER_ROLE.ADMIN, USER_ROLE.PHOTOGRAPHER,USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH), 
        ReviewController.createReview
    )

    .put(
        "/complete-pending/:reviewId",
        auth(USER_ROLE.USER, USER_ROLE.ADMIN, USER_ROLE.PHOTOGRAPHER,USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH), 
        ReviewController.completePendingReview
    )

    .get(
        "/", 
        ReviewController.getAllReviews
    )

    .get(
        "/my",
        auth(USER_ROLE.USER, USER_ROLE.COMPANY, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN),
        ReviewController.getMyReviews
    )

    .get(
        "/my/stats",
        auth(USER_ROLE.USER, USER_ROLE.COMPANY, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN),
        ReviewController.myReviewStats
    )

    .get(
        "/my/pending",
        auth(USER_ROLE.USER, USER_ROLE.COMPANY, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN),
        ReviewController.getMyPendingReviews
    )

    .get(
        "/service-provider/:serviceProviderId", 
        ReviewController.getReviewsByServiceProvider
    )

    .patch(
        "/update/:id", 
        auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER,USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN),
        ReviewController.updateReview
    )

    .delete(
        "/:id", 
        auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER,USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN), 
        ReviewController.deleteReview
    );


export const ReviewRoutes = router;
