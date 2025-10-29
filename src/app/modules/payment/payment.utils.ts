import Stripe from "stripe";
import AppError from "../../error/AppError";
import { IPayment } from "./payment.interface";
import { Payment } from "./payment.model";
import { GearOrder } from "../gearOrder/gearOrder.model";
import { GearMarketplace } from "../gearMarketplace/gearMarketplace.model";
import { Workshop } from "../workshop/workshop.model";
import { WorkshopParticipant } from "../workshopParticipant/workshopParticipant.model";


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
  } = payload;

  // ✅ Validate required fields
  if (!userId || !serviceProviderId || !amount || !paymentMethod || !paymentType) {
    throw new AppError(400, "Missing required payment details");
  }


  
  let finalServiceProviderId = serviceProviderId;

  // ======================================================
  // 🔹 Workshop Specific Validations
  // ======================================================
  if (paymentType === "workshop") {
    if (!workshopId) throw new AppError(400, "workshopId is required for workshop payment");

    const workshop = await Workshop.findById(workshopId);
    if (!workshop) throw new AppError(404, "Workshop not found");

     // 🚫 Prevent the author from joining their own workshop
    if (workshop.authorId.toString() === userId.toString()) {
      throw new AppError(400, "Authors cannot register for their own workshop");
    }
    
     // 🔸 Check if user already joined this workshop
    const existingParticipant = await WorkshopParticipant.findOne({
      workshopId,
      clientId: userId,
      isDeleted: false,
    });

    if (existingParticipant) {
      throw new AppError(400, "You are already registered for this workshop");
    }

    // Check if workshop expired
    const now = new Date();
    const workshopDateTime = new Date(workshop.date);
    if (workshop.time) {
      const [hours, minutes] = workshop.time.split(":").map(Number);
      workshopDateTime.setHours(hours, minutes, 0, 0);
    }
    if (workshopDateTime < now) throw new AppError(400, "Workshop is already expired");

    // Check participant limit
    const participantsCount = await WorkshopParticipant.countDocuments({ workshopId });
    if (workshop.maxParticipant > 0 && participantsCount >= workshop.maxParticipant) {
      throw new AppError(400, "Workshop participant limit reached");
    }

    finalServiceProviderId = workshop.authorId; // instructor
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
  };

  const paymentRecord = await Payment.create(newPayment);


  // ✅ Return the checkout URL and details
  return {
    checkoutUrl: session.url,
    paymentId: paymentRecord._id,
    currency: "EUR",
  };
};



export const createGearStripePaymentSession = async (payload: {
  userId: any;
  gearOrderIds: any[];
  amount: number;
  commission: number;
  netAmount: number;
  paymentMethod: "stripe" | "card" | "bank";
}) => {
  const {
    userId,
    gearOrderIds,
    amount,
    commission,
    netAmount,
    paymentMethod,
  } = payload;

  console.log({payload})

  if (!userId || !amount || !paymentMethod) {
    throw new AppError(400, "Missing required payment details");
  }

  // 🔹 Fetch GearOrders
  const orders = await GearOrder.find({ _id: { $in: gearOrderIds } });
  if (!orders.length) throw new AppError(404, "Gear orders not found");

  // 🔹 Fetch corresponding GearMarketplace items
  const gearItemIds = orders.map((o) => o.gearMarketplaceId);
  const gearItems = await GearMarketplace.find({ _id: { $in: gearItemIds } });

  // 🔹 Build service provider breakdown
  const serviceProvidersBreakdown = orders.map((order) => {
    const item = gearItems.find((g) => g._id.toString() === order.gearMarketplaceId.toString());
    if (!item) throw new AppError(400, "GearMarketplace item not found for order");

    const itemAmount = item.mainPrice || 0;
    const itemCommission = itemAmount - ((item.price || 0) + (item.vatAmount || 0));
    const itemNetAmount = itemAmount - itemCommission;

    return {
      serviceProviderId: order.sellerId,
      amount: itemAmount,
      commission: itemCommission,
      netAmount: itemNetAmount,
    };
  });
  
  // ✅ Create Stripe Checkout Session (one for all)
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: "Gear Marketplace Payment",
            description: `Payment for ${gearOrderIds.length} gear item(s)`,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.BACKEND_URL}/api/v1/payment/confirm-payment?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BACKEND_URL}/api/v1/payment/cancel`,
    invoice_creation: { enabled: true },
  });

  try {
      // ✅ Save one payment record for all orders
  const paymentRecord = await Payment.create({
    transactionId: session.id,
    userId,
    serviceProviders: serviceProvidersBreakdown, // array of seller IDs
    amount,
    commission,
    netAmount,
    paymentStatus: "pending",
    paymentMethod,
    paymentType: "gear",
    gearOrderIds
  });


  return {
    checkoutUrl: session.url,
    paymentId: paymentRecord._id,
  };
  } catch (error) {
    console.log(error)
  }

  
};
