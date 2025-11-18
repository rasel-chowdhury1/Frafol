import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { PaymentService } from "./payment.service";
import { EventOrder } from "../eventOrder/eventOrder.model";
import AppError from "../../error/AppError";
import { stripe } from "./payment.utils";
import { Payment } from "./payment.model";
import { WorkshopParticipant } from "../workshopParticipant/workshopParticipant.model";
import { Workshop } from "../workshop/workshop.model";
import httpStatus from "http-status";
/**
 * 🔹 Create Stripe Payment Session
 */
const createPaymentSession = catchAsync(async (req: Request, res: Response) => {
  
  const userId = (req as any)?.user?.userId;
  const { paymentType } = req.body;

  if (!paymentType) throw new AppError(400, "paymentType is required");

  let amount = 0;
  let commission = 0;
  let netAmount = 0;
  let serviceProviderId = "";
  let orderReferenceId: string | undefined = undefined; // Generic variable to store the correct order ID

  switch (paymentType) {
    case "event": {
      const { eventOrderId } = req.body;
      if (!eventOrderId) throw new AppError(400, "eventOrderId is required for event payment");

      const order = await EventOrder.findById(eventOrderId);
      if (!order) throw new AppError(404, "Event order not found");

      serviceProviderId = order.serviceProviderId.toString();
      amount = order.totalPrice ?? 0;
      commission = Math.max((order.priceWithServiceFee ?? 0) - amount, 0);
      netAmount = Math.max((order.totalPrice ?? 0) - commission, 0);
      orderReferenceId = eventOrderId;
      break;
    }

    case "workshop": {
        const { workshopId } = req.body;

        if (!workshopId) {
          throw new AppError(httpStatus.BAD_REQUEST, "workshopId is required for workshop payment");
        }


        // 🔹 Check if workshop exists
        const isExistWorkshop = await Workshop.findOne({
          _id: workshopId,
          isDeleted: false,
          approvalStatus: "approved",
        });

        if (!isExistWorkshop) {
          throw new AppError(httpStatus.NOT_FOUND, "Workshop not found or not approved");
        }

        // 🔹 Assign service provider (instructor)
        serviceProviderId = isExistWorkshop.authorId.toString();

        // 🔹 Calculate amounts
        const price = isExistWorkshop.price ?? 0;
        const mainPrice = isExistWorkshop.mainPrice ?? price;
        const vatAmount = isExistWorkshop.vatAmount;
        const vatPercent = isExistWorkshop.vatAmount ?? 0;

        // VAT calculation (if vatAmount is percentage)
        const vatValue = vatAmount || (price * vatPercent) / 100;

         commission = mainPrice - (price + vatValue);
         netAmount = mainPrice - commission;
         amount = mainPrice; // total amount user pays

        // 🔹 Assign order reference
        orderReferenceId = isExistWorkshop._id.toString();

        break;
    }

    // case "gear": {
    //   const { gearOrderId } = req.body;
    //   if (!gearOrderId) throw new AppError(400, "gearOrderId is required for gear payment");

    //   const order = await GearOrder.findById(gearOrderId);
    //   if (!order) throw new AppError(404, "Gear order not found");

    //   serviceProviderId = order.serviceProviderId.toString();
    //   amount = order.price ?? 0;
    //   commission = Math.max((order.priceWithServiceFee ?? 0) - amount, 0);
    //   netAmount = Math.max((order.totalPrice ?? 0) - commission, 0);
    //   orderReferenceId = gearOrderId;
    //   break;
    // }

    default:
      throw new AppError(400, "Invalid paymentType");
  }

  const paymentPayload = {
    userId,
    serviceProviderId,
    amount,
    commission,
    netAmount,
    paymentMethod: "stripe" as const,
    paymentType,
    eventOrderId: paymentType === "event" ? orderReferenceId : undefined,
    workshopId: paymentType === "workshop" ? orderReferenceId : undefined,
    gearOrderId: paymentType === "gear" ? orderReferenceId : undefined,
  };

  const result = await PaymentService.createPaymentSession(paymentPayload);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Stripe checkout session created successfully",
    data: result,
  });
});


/**
 * 🔹 Confirm Payment (Stripe Redirect)
 */
 const confirmPayment = catchAsync(async (req: Request, res: Response) => {

  const { session_id } = req.query;

    if (!session_id) {
      throw new AppError(400, "Missing sessionId ");
    }

  

  const result = await PaymentService.confirmPayment(
    String(session_id)
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payment confirmed successfully",
    data: "result",
  });
});

const confirmStripePayment = async (req: Request, res: Response) => {
  try {
    const { sessionId, transactionId } = req.query;

    if (!sessionId || !transactionId) {
      throw new AppError(400, "Missing sessionId or transactionId");
    }

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId as string);

    // Verify payment success
    if (session.payment_status === "paid") {
      // Update payment record
      await Payment.findOneAndUpdate(
        { transactionId },
        { paymentStatus: "success" },
        { new: true }
      );

    } else {
      await Payment.findOneAndUpdate(
        { transactionId },
        { paymentStatus: "failed" }
      );
      return res.redirect(`${process.env.FRONTEND_URL}/payment-failed`);
    }
  } catch (error) {
    console.error("Error confirming payment:", error);
    return res.redirect(`${process.env.FRONTEND_URL}/payment-error`);
  }
};


/**
 * 🔹 Cancel Payment
 */
 const cancelPayment = catchAsync(async (req: Request, res: Response) => {
  const { transactionId } = req.query;

  const result = await PaymentService.cancelPayment(String(transactionId));

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payment cancelled successfully",
    data: result,
  });
});


const getPayments = catchAsync(async (req: Request, res: Response) => {
  const query = req.query;

  const result = await PaymentService.getPayments(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payments retrieved successfully",
    data: result,
  });
});

const getMyPayments = catchAsync(async (req: Request, res: Response) => {
  // Assuming user is attached via auth middleware
  const {userId} = req.user;
  if (!userId) {
    throw new AppError(401, "Unauthorized: User not found");
  }

  // Pass userId and query to service
  const payments = await PaymentService.getMyPayments(userId, req.query);

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payments retrieved successfully",
    data: payments,
  });
});

const getMyPaymentsStats = catchAsync(async (req, res) => {
  const { userId } = req.user;

  if (!userId) {
    throw new AppError(httpStatus.BAD_REQUEST, "User ID not found");
  }

  const stats = await PaymentService.getMyPaymentsStats(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payment statistics fetched successfully",
    data: stats,
  });
});

export const PaymentController = {
  createPaymentSession,
  confirmPayment,
  cancelPayment,
  getPayments,
  getMyPayments,
  getMyPaymentsStats
}