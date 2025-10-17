import Stripe from "stripe";
import AppError from "../../error/AppError";
import { IPayment } from "./payment.interface";
import { Payment } from "./payment.model";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-09-30.clover", // ✅ Valid latest version
  typescript: true,
});

// 🔹 Convert Euro to Cents for Stripe
const calculateAmount = (amount: number) => Math.round(Number(amount) * 100);

/**
 * 🔹 createStripePaymentSession
 * --------------------------------------------------------
 * Creates Stripe Checkout session and stores payment record
 * Used for event, gear, or workshop payments.
 */
export const createStripePaymentSession = async (payload: {
  userId: any;
  serviceProviderId: any;
  amount: number;
  commission: number;
  netAmount: number;
  paymentMethod: "stripe" | "card" | "bank";
  paymentType: "event" | "gear" | "workshop";
  eventOrderId?: any;
  workshopId?: any;
  gearOrderId?: any;
}) => {
  const {
    userId,
    serviceProviderId,
    amount,
    commission,
    netAmount,
    paymentMethod,
    paymentType,
    eventOrderId,
    workshopId,
    gearOrderId,
  } = payload;

  // ✅ Validate required fields
  if (!userId || !serviceProviderId || !amount || !paymentMethod || !paymentType) {
    throw new AppError(400, "Missing required payment details");
  }



    // ✅ Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `${paymentType.toUpperCase()} Payment`,
            description: `${paymentType} booking payment`,
          },
          unit_amount: Math.round(amount * 100), // convert to cents
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.BACKEND_URL}/api/v1/payment/confirm-payment?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BACKEND_URL}/api/v1/payment/cancel`,
    invoice_creation: { enabled: true },
  });


  // ✅ Create local payment record in DB
  const newPayment: IPayment = {
    transactionId: session.id,
    userId,
    serviceProviderId,
    amount,
    commission,
    netAmount,
    paymentStatus: "pending",
    paymentMethod,
    paymentType,
    eventOrderId,
    workshopId,
    gearOrderId,
  };

  const paymentRecord = await Payment.create(newPayment);


  // ✅ Return the checkout URL and details
  return {
    checkoutUrl: session.url,
    paymentId: paymentRecord._id,
    currency: "EUR",
  };
};
