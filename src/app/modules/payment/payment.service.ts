import AppError from "../../error/AppError";
import { Payment } from "./payment.model";
import { createStripePaymentSession, stripe } from "./payment.utils";
import { IPayment } from "./payment.interface";
import { sentNotificationForPaymentSuccess } from "../../../socketIo";
import mongoose from "mongoose";
import { EventOrder } from "../eventOrder/eventOrder.model";
import { GearOrder } from "../gearOrder/gearOrder.model";
import { GearMarketplace } from "../gearMarketplace/gearMarketplace.model";
import { Workshop } from "../workshop/workshop.model";
import moment from "moment";
import { WorkshopParticipant } from "../workshopParticipant/workshopParticipant.model";

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
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    // 🔹 Retrieve Stripe Checkout Session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paymentIntentId = session.payment_intent as string | null;

    if (!paymentIntentId) {
      throw new AppError(httpStatus.BAD_REQUEST, "Payment intent not found in Stripe session");
    }

    // 🔹 Retrieve PaymentIntent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // 🔹 Find local payment record by sessionId (not paymentIntentId)
    const payment = await Payment.findOne({ transactionId: sessionId }).session(dbSession);
    if (!payment) {
      throw new AppError(httpStatus.NOT_FOUND, "Payment record not found for this session");
    }

    // 🔹 Handle Payment Status
    if (paymentIntent.status === "succeeded") {
      payment.paymentStatus = "completed";
      await payment.save({ session: dbSession });

      // ======================================================
      // ✅ EVENT Payment Handling
      // ======================================================
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
          { new: true, session: dbSession }
        );

        if (updatedOrder) {
          // await sentNotificationForPaymentSuccess({
          //   orderType: updatedOrder.orderType as "direct" | "custom",
          //   userId: new mongoose.Types.ObjectId(payment.userId),
          //   receiverId: new mongoose.Types.ObjectId(payment.serviceProviderId),
          //   serviceType: updatedOrder.serviceType,
          //   packageName: updatedOrder.packageName || undefined,
          // });

          console.log("✅ Payment succeeded & event order moved to 'inProgress'", {
            orderId: updatedOrder._id,
            paymentId: payment._id,
          });
        }
      }

      // ======================================================
      // ✅ GEAR Payment Handling
      // ======================================================
      else if (payment.paymentType === "gear" && payment.gearOrderIds?.length) {
        // Update all gear orders’ paymentStatus
        await GearOrder.updateMany(
          { _id: { $in: payment.gearOrderIds } },
          {  orderStatus: "inProgress", paymentId: payment._id },
          { session: dbSession }
        );


        // 2️⃣ Collect all related GearMarketplace IDs
        const relatedOrders = await GearOrder.find(
          { _id: { $in: payment.gearOrderIds } },
          { gearMarketplaceId: 1 }
        ).session(dbSession);

        const gearIds = relatedOrders.map((o) => o.gearMarketplaceId);

        // 3️⃣ Mark all related gear items as Sold Out
        await GearMarketplace.updateMany(
          { _id: { $in: gearIds } },
          { status: "Sold Out" },
          { session: dbSession }
        );

        console.log("✅ Payment succeeded & all gear orders marked as 'received'", {
          gearOrderCount: payment.gearOrderIds.length,
          paymentId: payment._id,
        });
      }

      else if(payment.paymentType === "workshop" && payment.workshopId){
        

       // 1️⃣ Generate custom order ID
        const today = moment().format("YYYYMMDD");
        const prefix = "WORKSHOP";
        const orderCount = await WorkshopParticipant.countDocuments({
          createdAt: {
            $gte: moment().startOf("day").toDate(),
            $lte: moment().endOf("day").toDate(),
          },
        });

        const sequence = String(orderCount + 1).padStart(4, "0");
        const customOrderId = `${prefix}-${today}-${sequence}`;

        // 2️⃣ Create Workshop Participant entry
        const participant = await WorkshopParticipant.create(
          [
            {
              orderId: customOrderId,
              clientId: payment.userId,
              instructorId: payment.serviceProviderId,
              workshopId: payment.workshopId,
              paymentStatus: "completed",
              instructorPayment: {
                status: "pending",
                amount: payment.netAmount, // from your Payment model
                paidAt: null,
              },
            },
          ],
          { session: dbSession }
        );




        
      }
    } else {
      payment.paymentStatus = "failed";
      await payment.save({ session: dbSession });
      console.log("❌ Payment failed for session:", sessionId);
    }

    // ✅ Commit all DB changes
    await dbSession.commitTransaction();
    dbSession.endSession();

    return payment;
  } catch (error) {
    // ❌ Rollback all DB operations on failure
    await dbSession.abortTransaction();
    dbSession.endSession();
    console.error("❌ Transaction rolled back due to error:", error);
    throw error;
  }
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
