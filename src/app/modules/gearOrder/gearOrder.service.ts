import AppError from '../../error/AppError';
import { GearMarketplace } from '../gearMarketplace/gearMarketplace.model';
import { ICreateGearOrderPayload, IGearOrder } from './gearOrder.interface';
import { GearOrder } from './gearOrder.model';
import moment from "moment";
import httpStatus from 'http-status';
import { createGearStripePaymentSession } from '../payment/payment.utils';
import QueryBuilder from '../../builder/QueryBuilder';
import mongoose from 'mongoose';
import { Payment } from '../payment/payment.model';

const createGearOrder = async (payload: IGearOrder) => {
  const order = await GearOrder.create(payload);
  return order;
};

const createGearOrders = async (payload: ICreateGearOrderPayload) => {
  const {
    userId,
    gearMarketPlaceIds,
    name,
    shippingAddress,
    postCode,
    town,
    mobileNumber,
    email,
    loginAsCompany = false,
    companyName = "",
    ico = "",
    dic = "",
    ic_dph = "",
    companyAddress = "",
    deliveryNote = "",
  } = payload;

  if (!gearMarketPlaceIds?.length) {
    throw new AppError(httpStatus.BAD_REQUEST, "No gear marketplace IDs provided.");
  }

  // ✅ Fetch valid gear items
  const gearItems = await GearMarketplace.find({
    _id: { $in: gearMarketPlaceIds },
    isDeleted: false,
    approvalStatus: "approved",
    status: { $ne: "Sold Out" },
  });

  if (!gearItems.length) {
    throw new AppError(httpStatus.NOT_FOUND, "No valid gear marketplace items found.");
  }

  // ========================================
  // 🔢 Generate Custom Gear Order IDs
  // ========================================
  const today = moment().format("YYYYMMDD");
  const prefix = "GEAR";
  let orderCount = await GearOrder.countDocuments({
    createdAt: {
      $gte: moment().startOf("day").toDate(),
      $lte: moment().endOf("day").toDate(),
    },
  });

  // ========================================
  // 🛒 Create Gear Orders
  // ========================================
  const ordersToCreate = gearItems.map((item) => {
    orderCount += 1;
    const sequence = String(orderCount).padStart(4, "0");
    const customOrderId = `${prefix}-${today}-${sequence}`;

    return {
      orderId: customOrderId,
      clientId: userId,
      sellerId: item.authorId,
      gearMarketplaceId: item._id,
      orderStatus: "pending",
      paymentStatus: "pending",
      name,
      shippingAddress,
      postCode,
      town,
      mobileNumber,
      email,
      loginAsCompany,
      companyName,
      ico,
      dic,
      ic_dph,
      companyAddress,
      deliveryNote,
      statusTimestamps: {
        createdAt: new Date(), // Initialize createdAt
        deliveryRequestAt: null,
        deliveryRequestDeclineAt: null,
        deliveredAt: null,
        cancelledAt: null,
      },
    };
  });

  const createdOrders = await GearOrder.insertMany(ordersToCreate);

  // ========================================
  // 💰 Calculate Total Payment (all sellers)
  // ========================================

  
  const totalShippingCharge = gearItems.reduce((acc,item) => acc + (item.shippingCompany.price || 0), 0);
  const totalAmount = gearItems.reduce((acc, item) => acc + (item.mainPrice || 0), 0);
  const totalPrice = gearItems.reduce((acc, item) => acc + (item.price || 0), 0);
  const totalVatAmount = gearItems.reduce((acc,item) => acc + (item.vatAmount || 0), 0)
  
  const commission = totalAmount - (totalPrice + totalVatAmount); 
  const netAmount = (totalAmount - commission) + totalShippingCharge;
  // ========================================
  // 💳 Create Single Stripe Payment Session
  // ========================================
  const stripeSession = await createGearStripePaymentSession({
    userId,
    gearOrderIds: createdOrders.map((o) => o._id),
    amount: totalAmount + totalShippingCharge,
    commission,
    netAmount,
    paymentMethod: "stripe",
  });

  // ========================================
  // ✅ Return Response
  // ========================================
  return  {
      checkoutUrl: stripeSession?.checkoutUrl,
      paymentId: stripeSession?.paymentId,
      totalAmount,
      totalCommission: commission,
      totalNetAmount: netAmount,
    };
}

const completePaymentGearOrderById = async (gearOrderId: string) => {
  if (!gearOrderId) throw new AppError(400, "Gear order ID is required");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Find the Gear Order
    const order = await GearOrder.findById(gearOrderId).session(session);
    if (!order) throw new AppError(404, "Gear order not found");

    if (order.paymentStatus === "received") {
      throw new AppError(400, "Payment already received for this order");
    }

    // 2️⃣ Update Gear Order payment status
    order.paymentStatus = "received";
    order.statusTimestamps.paymentCompletedAt = new Date();
    await order.save({ session });

    // 3️⃣ Update Payment document for the seller
    const paymentUpdateResult = await Payment.updateOne(
      {
        paymentType: "gear",
        gearOrderIds: order._id,
        "serviceProviders.serviceProviderId": order.sellerId,
        "serviceProviders.serviceProviderPaid": false,
      },
      {
        $set: {
          "serviceProviders.$.serviceProviderPaid": true,
          "serviceProviders.$.serviceProviderPaidAt": new Date(),
        },
      },
      { session }
    );

    if (paymentUpdateResult.matchedCount === 0) {
      throw new AppError(404, "Payment record for this gear order and service provider not found");
    }

    await session.commitTransaction();
    session.endSession();

    return {
      message: "Payment completed successfully",
      gearOrder: order,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const requestGearMarketplaceDelivery = async (
  orderId: string,
  sellerId: mongoose.Types.ObjectId
) => {
  // 🔹 Find the order
  const order = await GearOrder.findOne({
    _id: orderId,
    sellerId,
    isDeleted: false,
  }).populate("gearMarketplaceId");

  if (!order) {
    throw new AppError(404, "Gear order not found or unauthorized");
  }

  // 🔹 Validate current status
  if (!["inProgress", "deliveryRequestDeclined"].includes(order.orderStatus)) {
    throw new AppError(
      400,
      "You can only send a delivery request for an order that is pending or previously declined"
    );
  }

  // 🔹 Update order status and timestamp
  order.orderStatus = "deliveryRequest";
  order.statusTimestamps = {
    ...order.statusTimestamps,
    deliveryRequestAt: new Date(),
  };

  await order.save();

  return order;
};

const acceptDeliveryRequestByClient = async (
  orderId: string,
  clientId: mongoose.Types.ObjectId
) => {
  // 🔹 Find the order for the client
  const order = await GearOrder.findOne({
    _id: orderId,
    clientId,
    isDeleted: false,
  }).populate("gearMarketplaceId");

  if (!order) {
    throw new AppError(404, "Gear order not found or unauthorized");
  }

  // 🔹 Validate current status
  if (order.orderStatus !== "deliveryRequest") {
    throw new AppError(
      400,
      "Only orders with a delivery request can be accepted"
    );
  }

  // 🔹 Update order status
  order.orderStatus = "delivered"; // Or "delivered" if this indicates completion
  order.statusTimestamps = {
    ...order.statusTimestamps,
    deliveredAt: new Date(), // mark acceptance timestamp
  };

  await order.save();

  return order;
};

const declineDeliveryRequestByClient = async (
  orderId: string,
  clientId: mongoose.Types.ObjectId,
  reason: string
) => {
  // 🔹 Find the order for the client
  const order = await GearOrder.findOne({
    _id: orderId,
    clientId,
    isDeleted: false,
  }).populate("gearMarketplaceId");

  if (!order) {
    throw new AppError(404, "Gear order not found or unauthorized");
  }

  // 🔹 Validate current status
  if (order.orderStatus !== "deliveryRequest") {
    throw new AppError(
      400,
      "Only orders with a delivery request can be declined"
    );
  }

  // 🔹 Update order status and reason
  order.orderStatus = "deliveryRequestDeclined";
  order.deliveryRequestDeclinedReason = reason;
  order.statusTimestamps = {
    ...order.statusTimestamps,
    deliveryRequestDeclineAt: new Date(), // mark decline timestamp
  };

  await order.save();

  return order;
};

const cancelGearOrderBySeller = async (
  orderId: string,
  sellerId: mongoose.Types.ObjectId,
  role: string,
  reason: string
) => {
  // 🔹 Build query dynamically based on role
  const query: any = { _id: orderId, isDeleted: false };
  if (role !== "admin") query.sellerId = sellerId;

  // 🔹 Fetch the order
  const order = await GearOrder.findOne(query);
  if (!order) throw new AppError(404, "Gear order not found or unauthorized");

  // 🔹 Prevent invalid cancellations
  if (["delivered", "cancelled"].includes(order.orderStatus)) {
    throw new AppError(400, "Delivered or already cancelled orders cannot be cancelled");
  }

  // 🔹 Update and save
  Object.assign(order, {
    orderStatus: "cancelled",
    cancelReason: reason,
    cancelledBy: sellerId,
    "statusTimestamps.cancelledAt": new Date(),
  });

  await order.save();

  return order;
};



const getAllGearOrders = async (query: Record<string, unknown>) => {

    // 🎯 Base query (non-deleted only)
  const baseQuery: any = { isDeleted: false, status: { $ne: "delivered" } };

  // 🧠 Initialize QueryBuilder
  const queryBuilder = new QueryBuilder(
    GearOrder.find(baseQuery)
      .populate("clientId", "name  email phone companyName ico dic ic_dph address")
      .populate("sellerId", "name  email phone companyName ico dic ic_dph address")
      .populate("gearMarketplaceId", " name price vatAmount platformCommission mainPrice description condition shippingCompany gallery status approvalStatus ")
      .populate("paymentId", "transactionId paymentMethod"),
    query
  )
    .sort()
    .paginate()
    .fields();

  // ✅ Execute query and get total count
  const [result, meta] = await Promise.all([
    queryBuilder.modelQuery.lean(),
    queryBuilder.countTotal(),
  ]);

    // ✅ Return paginated result with meta
  return {
    meta,
    data: result,
  };
};

const getMyGearOrders = async (
  userId: string,
  role: "user" | "professional",
  tab: string,
  queryParams: Record<string, any> = {}
) => {
  // 🎯 Base query (non-deleted only)
  const baseQuery: any = { isDeleted: false };

  // 🎯 Role-based matching
  if (role === "professional") baseQuery.sellerId = userId;
  if (role === "user") baseQuery.clientId = userId;


    // 🎯 Tab-based filtering
  switch (role) {
    case "professional":

    if (!tab) {
    // Default when tab is not provided
    baseQuery.orderStatus = { $in: ["inProgress", "deliveryRequest", "delivered", "cancelled "] };
    break;
  }
      switch (tab) {
        case "pending":
          baseQuery.orderStatus = "pending";
          break;
        case "inProgress":
          baseQuery.orderStatus = "inProgress";
          break;
        case "delivered":
          baseQuery.orderStatus = "delivered";
          break;
        case "cancelled":
          baseQuery.orderStatus = "cancelled";
          break;
        case "deliveryRequest":
          baseQuery.orderStatus = "deliveryRequest";
          break;
        default:
          throw new AppError(400, `Invalid tab for professional: ${tab}`);
      }
      break;

    case "user":
      switch (tab) {
        case "currentOrder":
          baseQuery.orderStatus = "inProgress";
          break;
        case "inProgress":
          baseQuery.orderStatus = "inProgress";
          break;
        case "toConfirm":
          baseQuery.orderStatus = "deliveryRequest";
          break;
        case "delivered":
          baseQuery.orderStatus = "delivered";
          break;
        case "cancelled":
          baseQuery.orderStatus = "cancelled";
          break;
        default:
          throw new AppError(400, `Invalid tab for user: ${tab}`);
      }
      break;

    // default:
    //   throw new AppError(400, "Invalid role type — must be 'user' or 'professional'");
  }


  // 🧠 Initialize QueryBuilder
  const queryBuilder = new QueryBuilder(
    GearOrder.find(baseQuery)
      .populate("clientId", "name  email phone companyName ico dic ic_dph address")
      .populate("sellerId", "name  email phone companyName ico dic ic_dph address")
      .populate("gearMarketplaceId", " name price vatAmount platformCommission mainPrice description condition shippingCompany gallery status approvalStatus ")
      .populate("paymentId", "transactionId paymentMethod"),
    queryParams
  )
    .sort()
    .paginate()
    .fields();

  // ✅ Execute query and get total count
  const [result, meta] = await Promise.all([
    queryBuilder.modelQuery.lean(),
    queryBuilder.countTotal(),
  ]);

  // ✅ Return paginated result with meta
  return {
    meta,
    data: result,
  };
};

const getGearOrderById = async (id: string) => {
  const order = await GearOrder.findById(id).populate('clientId sellerId gearMarketplaceId');
  if (!order || order.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Gear order not found');
  }
  return order;
};

const updateGearOrder = async (id: string, payload: Partial<IGearOrder>) => {
  const updated = await GearOrder.findOneAndUpdate(
    { _id: id, isDeleted: false },
    payload,
    { new: true }
  );
  if (!updated) throw new AppError(httpStatus.NOT_FOUND, 'Gear order not found');
  return updated;
};

const deleteGearOrder = async (id: string) => {
  const deleted = await GearOrder.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );
  if (!deleted) throw new AppError(httpStatus.NOT_FOUND, 'Gear order not found');
  return deleted;
};

export const GearOrderService = {
  createGearOrder,
  createGearOrders,
  getAllGearOrders,
  getMyGearOrders,
  getGearOrderById,
  updateGearOrder,
  deleteGearOrder,
  requestGearMarketplaceDelivery,
  declineDeliveryRequestByClient,
  acceptDeliveryRequestByClient,
  cancelGearOrderBySeller,
  completePaymentGearOrderById
};
