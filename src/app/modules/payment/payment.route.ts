import express from "express";
import { PaymentController } from "./payment.controller";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constants";


const router = express.Router();

//  Create new Stripe payment session
router.post(
    "/create-session", 
    auth(USER_ROLE.USER),
    PaymentController.createPaymentSession
)

//  Confirm payment (redirect URL from Stripe)
.get("/confirm-payment", PaymentController.confirmPayment)



.get(
    "/earnings", 
    PaymentController.getPayments
)

.get("/cancel", PaymentController.cancelPayment);
 
export const PaymentRoutes = router;
