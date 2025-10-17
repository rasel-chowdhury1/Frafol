import AppError from "../../error/AppError";
import { Payment } from "./payment.model";
import { createStripePaymentSession, stripe } from "./payment.utils";
import { IPayment } from "./payment.interface";
import { sentNotificationForPaymentSuccess } from "../../../socketIo";
import mongoose from "mongoose";
import { EventOrder } from "../eventOrder/eventOrder.model";

/**
 * 🔹 Create Payment Session (Stripe Checkout)
 */
const createPaymentSession = async (payload: {
  userId: string;
  serviceProviderId: string;
  amount: number;
  commission: number;
  netAmount: number;
  paymentMethod: "stripe" | "card" | "bank";
  paymentType: "event" | "gear" | "workshop";
  eventOrderId?: string;
  workshopId?: string;
  gearOrderId?: string;
}) => {
  return await createStripePaymentSession(payload);
};

/**
 * 🔹 Confirm Stripe Payment
 */
const confirmPayment = async (sessionId: string) => {
  // 🔹 Retrieve Stripe Checkout Session
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  const paymentIntentId = session.payment_intent as string | null;
  
  if (!paymentIntentId) {
    throw new AppError(400, "Payment intent not found in Stripe session");
  }

  // 🔹 Retrieve PaymentIntent from Stripe
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  // 🔹 Find local payment record by sessionId (not paymentIntentId)
  const payment = await Payment.findOne({ transactionId: sessionId });
  if (!payment) {
    throw new AppError(404, "Payment record not found for this session");
  }

  // 🔹 Handle Payment Status
  if (paymentIntent.status === "succeeded") {
    payment.paymentStatus = "completed";
    await payment.save();

    // ✅ If related to an event order, update order status
    if (payment.paymentType === "event" && payment.eventOrderId) {
      const updatedOrder = await EventOrder.findByIdAndUpdate(
        payment.eventOrderId,
        {
          status: "inProgress",
          "statusTimestamps.inProgressAt": new Date(),
          $push: {
            statusHistory: {
              status: "inProgress",
              changedAt: new Date(),
            },
          },
        },
        { new: true }
      );

      if (updatedOrder) {
        // ✅ Send success notification to service provider
        await sentNotificationForPaymentSuccess({
          orderType: updatedOrder.orderType as "direct" | "custom",
          userId: new mongoose.Types.ObjectId(payment.userId),
          receiverId: new mongoose.Types.ObjectId(payment.serviceProviderId),
          serviceType: updatedOrder.serviceType,
          packageName: updatedOrder.packageName || undefined,
        });

        console.log("✅ Payment succeeded & event order moved to 'inProgress'", {
          orderId: updatedOrder._id,
          paymentId: payment._id,
        });
      }
    }
  } else {
    payment.paymentStatus = "failed";
    await payment.save();
    console.log("❌ Payment failed for session:", sessionId);
  }

  return payment;
};

// const confirmStripePayment = async (req: Request, res: Response) => {
//   try {
//     const { sessionId, transactionId } = req.query;

//     if (!sessionId || !transactionId) {
//       throw new AppError(400, "Missing sessionId or transactionId");
//     }

//     // Retrieve session from Stripe
//     const session = await stripe.checkout.sessions.retrieve(sessionId as string);

//     // Verify payment success
//     if (session.payment_status === "paid") {
//       // Update payment record
//       await Payment.findOneAndUpdate(
//         { transactionId },
//         { paymentStatus: "success" },
//         { new: true }
//       );

//       // (optional) Trigger order-in-progress notification
//       // sentNotificationForPaymentSuccess(...);

//       return res.redirect(`${process.env.FRONTEND_URL}/payment-success`);
//     } else {
//       await Payment.findOneAndUpdate(
//         { transactionId },
//         { paymentStatus: "failed" }
//       );
//       return res.redirect(`${process.env.FRONTEND_URL}/payment-failed`);
//     }
//   } catch (error) {
//     console.error("Error confirming payment:", error);
//     return res.redirect(`${process.env.FRONTEND_URL}/payment-error`);
//   }
// };

/**
 * 🔹 Cancel Payment
 */
const cancelPayment = async (transactionId: string) => {
  const payment = await Payment.findOne({ transactionId });

  if (!payment) throw new AppError(404, "Payment not found");

  payment.paymentStatus = "pending"; // keep it pending or custom logic
  await payment.save();

  return payment;
};

export const PaymentService = {
  createPaymentSession,
  confirmPayment,
  cancelPayment,
};
