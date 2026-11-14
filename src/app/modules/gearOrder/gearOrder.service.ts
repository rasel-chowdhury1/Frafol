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
import { User } from '../user/user.model';
import {
  sentNotificationForGearOrderPayoutCompleted,
  sentNotificationForGearDeliveryRequest,
  sentNotificationForGearDeliveryAccepted,
  sentNotificationForGearDeliveryDeclined,
  sentNotificationForGearOrderCancelled,
  sentNotificationForRefundRequired,
  sentNotificationForGearOrderRefundCompleted,
} from '../../../socketIo';

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
    companyPostCode = "",
    companyTown = "",
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
      companyPostCode,
      companyTown,
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

    // 🔔 Notify the seller that their payment/payout has been processed
    Promise.all([
      GearMarketplace.findById(order.gearMarketplaceId).select('name'),
      Payment.findOne({ paymentType: 'gear', gearOrderIds: order._id, 'serviceProviders.serviceProviderId': order.sellerId }),
    ])
      .then(([gearItem, payment]) => {
        const breakdown = payment?.serviceProviders?.find(
          (sp) => sp.serviceProviderId.toString() === order.sellerId.toString(),
        );
        return sentNotificationForGearOrderPayoutCompleted({
          sellerId: order.sellerId,
          orderId: order.orderId,
          itemName: gearItem?.name,
          netAmount: breakdown?.netAmount,
        });
      })
      .catch((err) => console.error('Gear payout completed notification failed:', err));

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

// 💸 Admin marks a cancelled gear order as refunded to the customer
const completeRefundGearOrderById = async (gearOrderId: string) => {
  if (!gearOrderId) throw new AppError(400, "Gear order ID is required");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await GearOrder.findById(gearOrderId).session(session);
    if (!order) throw new AppError(404, "Gear order not found");

    if (order.orderStatus !== "cancelled") {
      throw new AppError(400, "Only cancelled orders can be refunded");
    }

    if (order.isRefunded) {
      throw new AppError(400, "Refund for this order is already completed");
    }

    if (order.paymentStatus === "received") {
      throw new AppError(400, "Seller payout was already completed for this order");
    }

    // The single payment can cover several gear orders (possibly from other sellers)
    const payment = await Payment.findOne({
      paymentType: "gear",
      gearOrderIds: order._id,
      paymentStatus: "completed",
    }).session(session);

    if (!payment) {
      throw new AppError(400, "No completed payment found to refund for this order");
    }

    // Refund only this order's share: item price + its shipping
    const gearItem = await GearMarketplace.findById(order.gearMarketplaceId)
      .select("name mainPrice shippingCompany")
      .session(session);

    const refundAmount = Number(
      ((gearItem?.mainPrice || 0) + (gearItem?.shippingCompany?.price || 0)).toFixed(2),
    );

    order.isRefunded = true;
    order.refundedAmount = refundAmount;
    order.statusTimestamps.refundedAt = new Date();
    await order.save({ session });

    // Once every order in the payment is refunded, mark the payment itself refunded
    const unrefunded = await GearOrder.countDocuments({
      _id: { $in: payment.gearOrderIds },
      isRefunded: { $ne: true },
    }).session(session);

    if (unrefunded === 0) {
      payment.paymentStatus = "refound";
      await payment.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    // 🔔 Notify the customer (socket + email)
    sentNotificationForGearOrderRefundCompleted({
      customerId: order.clientId,
      orderId: order.orderId,
      itemName: gearItem?.name,
      amount: refundAmount,
    }).catch((err) => console.error("Gear refund completed notification failed:", err));

    return {
      message: "Refund completed successfully",
      gearOrder: order,
      refundedAmount: refundAmount,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// 💸 Refund management: cancelled gear orders that were paid by the customer
// query: paymentStatus=paid|unpaid (omit for both), searchTerm, page, limit
// paid = refund already paid to the customer, unpaid = refund still pending
const getRefundManagementGearOrders = async (query: Record<string, any>) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.max(Number(query.limit) || 10, 1);
  const { searchTerm } = query;

  const statusFilter = String(query.paymentStatus || query.refundStatus || "").toLowerCase();

  const match: Record<string, any> = { orderStatus: "cancelled", isDeleted: false };

  if (statusFilter === "paid" || statusFilter === "refunded" || statusFilter === "refound") {
    match.isRefunded = true;
  } else if (statusFilter === "unpaid" || statusFilter === "pending" || statusFilter === "completed") {
    match.isRefunded = { $ne: true };
  }

  // 🔎 Search by order id, client/seller name, or gear item name
  if (searchTerm) {
    const regex = { $regex: String(searchTerm), $options: "i" };
    const [matchingUsers, matchingItems] = await Promise.all([
      User.find({
        $or: [{ name: regex }, { sureName: regex }, { companyName: regex }, { email: regex }],
      }).select("_id"),
      GearMarketplace.find({ name: regex }).select("_id"),
    ]);
    const userIds = matchingUsers.map((u) => u._id);

    match.$or = [
      { orderId: regex },
      { name: regex },
      { clientId: { $in: userIds } },
      { sellerId: { $in: userIds } },
      { gearMarketplaceId: { $in: matchingItems.map((g) => g._id) } },
    ];
  }

  const userProjection = { name: 1, sureName: 1, companyName: 1, profileImage: 1, email: 1 };

  const [data] = await GearOrder.aggregate([
    { $match: match },
    {
      $lookup: {
        from: Payment.collection.name,
        let: { orderObjId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $in: ["$$orderObjId", { $ifNull: ["$gearOrderIds", []] }] },
              paymentType: "gear",
              paymentStatus: { $in: ["completed", "refound"] },
            },
          },
          { $limit: 1 },
          { $project: { transactionId: 1, amount: 1, paymentMethod: 1, paymentStatus: 1, createdAt: 1 } },
        ],
        as: "payment",
      },
    },
    // Only orders the customer actually paid for
    { $match: { "payment.0": { $exists: true } } },
    { $addFields: { payment: { $arrayElemAt: ["$payment", 0] } } },
    {
      $addFields: {
        refundStatus: { $cond: [{ $eq: ["$isRefunded", true] }, "paid", "unpaid"] },
        refundedAt: "$statusTimestamps.refundedAt",
        // Refund is blocked once the seller payout was completed
        payoutCompleted: { $eq: ["$paymentStatus", "received"] },
      },
    },
    { $sort: { "statusTimestamps.cancelledAt": -1, createdAt: -1 } },
    {
      $facet: {
        result: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $lookup: {
              from: User.collection.name,
              localField: "clientId",
              foreignField: "_id",
              pipeline: [{ $project: userProjection }],
              as: "clientId",
            },
          },
          {
            $lookup: {
              from: User.collection.name,
              localField: "sellerId",
              foreignField: "_id",
              pipeline: [{ $project: userProjection }],
              as: "sellerId",
            },
          },
          {
            $lookup: {
              from: GearMarketplace.collection.name,
              localField: "gearMarketplaceId",
              foreignField: "_id",
              pipeline: [{ $project: { name: 1, price: 1, mainPrice: 1, vatAmount: 1, shippingCompany: 1, images: 1 } }],
              as: "gearMarketplaceId",
            },
          },
          {
            $addFields: {
              clientId: { $arrayElemAt: ["$clientId", 0] },
              sellerId: { $arrayElemAt: ["$sellerId", 0] },
              gearMarketplaceId: { $arrayElemAt: ["$gearMarketplaceId", 0] },
            },
          },
        ],
        total: [{ $count: "count" }],
      },
    },
  ]);

  const total = data?.total?.[0]?.count || 0;

  return {
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
    result: data?.result || [],
  };
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
  order.autoDeliveryReminderSentAt = null; // new request → the 48h reminder may fire again
  order.statusTimestamps = {
    ...order.statusTimestamps,
    deliveryRequestAt: new Date(),
  };

  await order.save();

  // 🔔 Notify the client that delivery has been requested
  sentNotificationForGearDeliveryRequest({
    sellerId,
    clientId: order.clientId,
    itemName: (order.gearMarketplaceId as any)?.name,
  }).catch((err) => console.error('Gear delivery request notification failed:', err));

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

  // 🔔 Notify the seller that the client accepted the delivery
  sentNotificationForGearDeliveryAccepted({
    sellerId: order.sellerId,
    clientId,
    itemName: (order.gearMarketplaceId as any)?.name,
  }).catch((err) => console.error('Gear delivery accepted notification failed:', err));

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

  // 🔔 Notify the seller that the client declined the delivery
  sentNotificationForGearDeliveryDeclined({
    sellerId: order.sellerId,
    clientId,
    itemName: (order.gearMarketplaceId as any)?.name,
    reason,
  }).catch((err) => console.error('Gear delivery declined notification failed:', err));

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
  const order = await GearOrder.findOne(query).populate("gearMarketplaceId", "name mainPrice");
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

  const gearItem = order.gearMarketplaceId as any;

  // 🔔 Notify the client that their order was cancelled
  sentNotificationForGearOrderCancelled({
    cancelledBy: sellerId,
    clientId: order.clientId,
    itemName: gearItem?.name,
    reason,
  }).catch((err) => console.error('Gear order cancelled notification failed:', err));

  // 🔔 Notify admins that a refund may be required
  if (order.paymentStatus === "received") {
    sentNotificationForRefundRequired({
      cancelledBy: sellerId,
      customerId: order.clientId,
      orderId: order._id as mongoose.Types.ObjectId,
      serviceType: "gear item",
      paidAmount: gearItem?.mainPrice,
    }).catch((err) => console.error('Admin refund notification failed:', err));
  }

  return order;
};



const getAllGearOrders = async (query: Record<string, unknown>) => {

  console.log({query})

    // 🎯 Base query (non-deleted only)
  const baseQuery: any = { isDeleted: false };

  // 🔎 Search across GearOrder's own fields, the linked gear item's name,
  // and the client/seller User accounts' name, email, and phone
  const searchTerm = (query.searchTerm || query.search) as string | undefined;
  if (searchTerm) {
    const [matchingGearItems, matchingUsers] = await Promise.all([
      GearMarketplace.find({
        name: { $regex: searchTerm, $options: 'i' },
      }).select('_id'),
      User.find({
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
          { phone: { $regex: searchTerm, $options: 'i' } },
        ],
      }).select('_id'),
    ]);

    const matchingUserIds = matchingUsers.map((u) => u._id);

    baseQuery.$or = [
      { orderId: { $regex: searchTerm, $options: 'i' } },
      { name: { $regex: searchTerm, $options: 'i' } },
      { town: { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } },
      { mobileNumber: { $regex: searchTerm, $options: 'i' } },
      { companyName: { $regex: searchTerm, $options: 'i' } },
      { gearMarketplaceId: { $in: matchingGearItems.map((g) => g._id) } },
      { clientId: { $in: matchingUserIds } },
      { sellerId: { $in: matchingUserIds } },
    ];
  }

  // 🧠 Initialize QueryBuilder
  const queryBuilder = new QueryBuilder(
    GearOrder.find(baseQuery)
      .populate("clientId", "name  email phone companyName ico dic ic_dph address town zipCode")
      .populate("sellerId", "name  email phone companyName ico dic ic_dph address town zipCode")
      .populate("gearMarketplaceId", " name price vatAmount totalVatAmount platformCommission mainPrice description condition shippingCompany gallery status approvalStatus ")
      .populate("paymentId", "transactionId paymentMethod"),
    query
  )
    .filter()
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

  // 🔎 Search across GearOrder's own fields AND the linked gear item's name
  const searchTerm = queryParams.searchTerm as string | undefined;
  if (searchTerm) {
    const matchingGearItems = await GearMarketplace.find({
      name: { $regex: searchTerm, $options: 'i' },
    }).select('_id');

    baseQuery.$or = [
      { orderId: { $regex: searchTerm, $options: 'i' } },
      { name: { $regex: searchTerm, $options: 'i' } },
      { town: { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } },
      { companyName: { $regex: searchTerm, $options: 'i' } },
      { gearMarketplaceId: { $in: matchingGearItems.map((g) => g._id) } },
    ];
  }

  // 🧠 Initialize QueryBuilder
  const queryBuilder = new QueryBuilder(
    GearOrder.find(baseQuery)
      .populate("clientId", "name  email phone companyName ico dic ic_dph address ")
      .populate("sellerId", "name  email phone companyName ico dic ic_dph address town zipCode")
      .populate("gearMarketplaceId", " name price vatAmount totalVatAmount platformCommission mainPrice description condition shippingCompany gallery status approvalStatus ")
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
  completePaymentGearOrderById,
  completeRefundGearOrderById,
  getRefundManagementGearOrders
};
