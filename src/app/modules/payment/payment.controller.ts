import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { PaymentService } from "./payment.service";
import { EventOrder } from "../eventOrder/eventOrder.model";
import AppError from "../../error/AppError";
import { stripe } from "./payment.utils";
import { Payment } from "./payment.model";

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

    // case "workshop": {
    //   const { workshopOrderId } = req.body;
    //   if (!workshopOrderId) throw new AppError(400, "workshopOrderId is required for workshop payment");

    //   const order = await WorkshopOrder.findById(workshopOrderId);
    //   if (!order) throw new AppError(404, "Workshop order not found");

    //   serviceProviderId = order.serviceProviderId.toString();
    //   amount = order.price ?? 0;
    //   commission = Math.max((order.priceWithServiceFee ?? 0) - amount, 0);
    //   netAmount = Math.max((order.totalPrice ?? 0) - commission, 0);
    //   orderReferenceId = workshopOrderId;
    //   break;
    // }

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

  return sendResponse(res, {
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

  return sendResponse(res, {
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

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payment cancelled successfully",
    data: result,
  });
});


export const PaymentController = {
  createPaymentSession,
  confirmPayment,
  cancelPayment
}