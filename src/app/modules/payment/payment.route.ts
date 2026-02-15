import express from "express";
import { PaymentController } from "./payment.controller";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constants";


const router = express.Router();

//  Create new Stripe payment session
router.post(
    "/create-session", 
    auth(USER_ROLE.USER, USER_ROLE.COMPANY, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN),
    PaymentController.createPaymentSession
)

//  Confirm payment (redirect URL from Stripe)
.get("/confirm-payment", PaymentController.confirmPayment)



.get(
    "/earnings", 
    PaymentController.getPayments
)

.get(
    "/my", 
    auth(USER_ROLE.USER),
    PaymentController.getMyPayments
)

.get(
    "/my-stats", 
    auth(USER_ROLE.USER),
    PaymentController.getMyPaymentsStats
)

.get("/cancel", PaymentController.cancelPayment);
 
export const PaymentRoutes = router;
