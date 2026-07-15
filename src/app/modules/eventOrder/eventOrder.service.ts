
import mongoose, { Types } from "mongoose";
import { EventOrder } from "./eventOrder.model";
import { IEventOrder } from "./eventOrder.interface";
import QueryBuilder from "../../builder/QueryBuilder";
import AppError from "../../error/AppError";
import { Review } from "../review/review.model";
import { Payment } from "../payment/payment.model";
import { sentNotificationForBookingRequest, sentNotificationForCancelRequest, sentNotificationForCancelRequestDeclined, sentNotificationForDeliveryAccepted, sentNotificationForDeliveryRequest, sentNotificationForExtensionAccepted, sentNotificationForExtensionRejected, sentNotificationForExtensionRequest, sentNotificationForOrderAccepted, sentNotificationForOrderCancelled, sentNotificationForOrderDeclined, sentNotificationForRefundRequired } from "../../../socketIo";

const createEventOrder = async (payload: IEventOrder) => {
    
  console.log("Creating EventOrder with payload:", payload);
  const result = await EventOrder.create(payload);

  // 🚀 Send notification asynchronously (non-blocking)
  sentNotificationForBookingRequest({
    userId: payload.userId,
    receiverId: payload.serviceProviderId,
    orderType: payload.orderType, // 'direct' | 'custom'
    packageName: payload?.packageName, // only for direct order
    serviceType: payload?.serviceType, // only for custom order
  }).catch((err) => {
    console.error("Failed to send booking notification:", err.message);
  });

  return result;
};

const completePaymentEventOrder = async (eventOrderId: string) => {
  if (!eventOrderId) {
    throw new AppError(400, "Event order ID is required");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Find the event order within the session
    const eventOrder = await EventOrder.findById(eventOrderId).session(session);

    if (!eventOrder) {
      throw new AppError(404, "Event order not found");
    }

    if (eventOrder.paymentStatus === "Paid") {
      throw new AppError(400, "Payment for this order is already completed");
    }

    // 2️⃣ Update EventOrder payment status
    eventOrder.paymentStatus = "Paid";
    eventOrder.statusTimestamps.paymentCompletedAt = new Date();

    await eventOrder.save({ session });

    // 3️⃣ Update related Payment(s)
    const paymentUpdateResult = await Payment.updateOne(
      { eventOrderId: eventOrder._id, paymentStatus: "completed" },
      {
        $set: {
          serviceProviderPaid: true,
          serviceProviderPaidAt: new Date(),
        },
      },
      { session }
    );

    // 4️⃣ Commit transaction
    await session.commitTransaction();
    session.endSession();

    return {
      message: "Payment completed successfully and service provider marked as paid",
      eventOrder,
      updatedPayments: paymentUpdateResult.modifiedCount,
    };
  } catch (error) {
    // Abort transaction if any error occurs
    await session.abortTransaction();
    session.endSession();

    throw new AppError( 500,
      (error as any)?.message || "Failed to complete payment for event order"
    );
  }
};


const getEventOrders = async (query: Record<string, unknown>) => {
  const eventOrderQuery = new QueryBuilder(EventOrder.find({ isDeleted: false, }), query)
    .filter() // apply filters (userId, serviceProviderId, orderType, etc.)
    .search(["orderId", "location", "town", "country"]) // allow searching by these fields
    .sort()
    .paginate()
    .fields();

  const result = await eventOrderQuery.modelQuery
    .populate("userId", "name sureName profileImage role switchRole email address town zipCode ico dic ic_dph")
    .populate("serviceProviderId", "name sureName profileImage role switchRole email address town zipCode ico dic ic_dph")
    .populate("packageId", "title description price vatAmount mainPrice")
    .exec();

  const meta = await eventOrderQuery.countTotal();

  return { meta, result };
};


const getMyEventOrders = async (
  userId: string,
  role: "user" | "professional",
  tab: string,
  queryParams: Record<string, any> = {}
) => {
  // 🎯 Base query (non-deleted only)
  const baseQuery: any = { isDeleted: false };

  // 🎯 Role-based matching
  if (role === "professional") baseQuery.serviceProviderId = userId;
  if (role === "user") baseQuery.userId = userId;

  // 🎯 Tab-based filtering
  switch (role) {
    // ==========================
    // 👨‍🔧 Professional Tabs
    // ==========================
    case "professional":
      switch (tab) {
        case "delivered":
          baseQuery.status = "delivered";
          break;
        case "inProgress":
          baseQuery.status = { $in: ["inProgress", "deliveryRequest", "deliveryRequestDeclined"] };
          baseQuery.date = { $lte: new Date() };
          // baseQuery.sort = "date"; 
          break;
        case "upcoming":
          baseQuery.status = { $in: ["inProgress", "deliveryRequest", "deliveryRequestDeclined"] };
          baseQuery.date = { $gte: new Date() };
          // baseQuery.sort = "date"; 
          break;
        case "pending":
          baseQuery.status = "pending";
          break;
        case "accepted":
          
          baseQuery.status = "accepted";
          break;
        case "deliveryRequest":
          baseQuery.status = "deliveryRequest";
          break;
        case "delivered":
          baseQuery.status = "delivered";
          break;
        case "cancelled":
          baseQuery.status = "cancelled";
          break;
        case "cancelRequest":
          baseQuery.status = "cancelRequest";
          break;
        default:
          throw new AppError(400, `Invalid tab for professional: ${tab}`);
      }
      break;

    // ==========================
    // 👤 User Tabs
    // ==========================
    case "user":
      switch (tab) {
        case "currentOrder":
          baseQuery.status = { $in: ["inProgress", "deliveryRequestDeclined"] };
          // baseQuery.sort = "date"; // ✅ Nearest future event first
          break;
        case "toConfirm":
          baseQuery.status = "deliveryRequest";
          break;
        case "delivered":
          baseQuery.status = "delivered";
          break;
        case "pending":
          baseQuery.status = "pending";
          break;
        case "accepted":
          baseQuery.orderType = "direct";
          baseQuery.status = "accepted";
          break;
        case "orderOffer":
          baseQuery.orderType = "custom";
          baseQuery.status = "accepted";
          break;
        case "myOffer":
          baseQuery.orderType = "custom";
          baseQuery.status = { $in: ["pending", "accepted"] };
          break;
        case "cancelled":
          baseQuery.status = "cancelled";
          break;
        case "cancelRequest":
          baseQuery.status = "cancelRequest";
          break;
        default:
          throw new AppError(400, `Invalid tab for user: ${tab}`);
      }
      break;

    default:
      throw new AppError(400, "Invalid role type — must be 'user' or 'professional'");
  }

  if (!queryParams.sort) queryParams.sort = '-updatedAt';

  // 🧠 Initialize QueryBuilder
  const queryBuilder = new QueryBuilder(
    EventOrder.find(baseQuery)
      .populate("userId", "name profileImage email phone companyName ico dic ic_dph address town zipCode")
      .populate("serviceProviderId", "name profileImage email phone companyName ico dic ic_dph address town zipCode")
      .populate({
        path: "packageId",
        select: "title price description",
        // match: { $expr: { $eq: ["$orderType", "direct"] } },
      }),
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


const getMyExtensionEventOrders = async (userId: string) => {
  try {
    // ✅ Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID");
    }

    // ✅ Find orders for this user with specific statuses
    const orders = await EventOrder.find({
      userId: userId,
      status: { $in: ["inProgress", "deliveryRequestDeclined"] },
      "extensionRequests.status": "pending", 
      "extensionRequests.0": { $exists: true },
      isDeleted: false,
    })
      .populate("userId", "name email")
      .populate("serviceProviderId", "name email")
      .populate("packageId", "_id title description price mainPrice")
      .populate("extensionRequests.requestedBy", "name email")
      .sort({ createdAt: -1 });

    if (!orders || orders.length === 0) {
      return {
        success: true,
        message: "No extension requests found for this user.",
        data: [],
      };
    }

    // ✅ Only keep the last extension request per order
    const result = orders.map(order => {
      const lastExtensionRequest =
        order.extensionRequests.length > 0
          ? order.extensionRequests[order.extensionRequests.length - 1]
          : null;

      return {
        ...order.toObject(),
        extensionRequests: lastExtensionRequest ? [lastExtensionRequest] : [],
      };
    });

    return result
  } catch (error: any) {
    console.error("❌ Error in getMyExtensionEventOrders:", error.message);
    return {
      success: false,
      message: error.message || "Failed to fetch extension request orders.",
      data: [],
    };
  }
};


const getAllDeliveredOrders = async (query: Record<string, any>) => {
  const baseFilter = {
    deliveryStatus: "delivered",
    isDeleted: false,
  };

  const eventOrderQuery = new QueryBuilder(
    EventOrder.find(baseFilter)
      .populate("userId", "name profileImage email")
      .populate("serviceProviderId", "name profileImage email")
      .populate("packageId", "packageName price")
      .sort({ createdAt: -1 }),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await eventOrderQuery.modelQuery;
  const meta = await eventOrderQuery.countTotal();

  return {
    meta,
    result,
  };
};




const getEventOrderById = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid EventOrder ID");
  }

  const result = await EventOrder.findById(id)
    .populate("userId", "name sureName")
    .populate("serviceProviderId", "name sureName");

  if (!result) {
    throw new Error("EventOrder not found");
  }

  return result;
};


const getMyEventOrderStats = async (userId: string, role: string) => {
  const baseFilter: any = { isDeleted: false };

  if (role === "user") baseFilter.userId = userId;
  else if (role === "professional") baseFilter.serviceProviderId = userId;
  else throw new Error("Invalid role");

  const orders = await EventOrder.find(baseFilter).select("status");

  if (!orders.length) {
    return {
      totalDelivered: 0,
      totalInProgress: 0,
      totalPending: 0,
      totalDeliveryRequest: 0,
      totalUpcoming: 0,
    };
  }

  // 📊 Different stats by role
  if (role === "user") {
    return {
      totalCurrentOrder: orders.filter(o => o.status === "inProgress").length,
      totalToConfirm: orders.filter(o => o.status === "deliveryRequest").length,
      totalDelivered: orders.filter(o => o.status === "delivered").length,
      totalPending: orders.filter(o => o.status === "pending").length,
    };
  } else if (role === "professional") {
    return {
      totalDelivered: orders.filter(o => o.status === "delivered").length,
      totalInProgress: orders.filter(o => o.status === "inProgress").length,
      totalUpcoming: orders.filter(o => o.status === "accepted").length,
      totalPending: orders.filter(o => o.status === "pending").length,
    };
  }
};

const updateEventOrderStatus = async (id: string, status: string) => {
  if (!["pending", "accepted", "inProgress", "delivered", "cancelled"].includes(status)) {
    throw new Error("Invalid status value");
  }

  const result = await EventOrder.findByIdAndUpdate(
    id,
    { $push: { status } },
    { new: true }
  );

  if (!result) throw new Error("EventOrder not found");
  return result;
};



const requestExtension = async (
  orderId: string,
  requestedBy: string,
  newDeliveryDate: Date,
  reason: string
) => {
  // 1️⃣ Check if there is any pending extension request
  const order = await EventOrder.findById(orderId);

  if (!order) throw new Error("EventOrder not found");

  const pendingExtensionRequest = order.extensionRequests.some(
    (request) => request.status === "pending"
  );

  if (pendingExtensionRequest) {
    throw new Error("There is already a pending extension request.");
  }

  // 2️⃣ If no pending request, create a new extension request
  const result = await EventOrder.findByIdAndUpdate(
    orderId,
    {
      $push: {
        extensionRequests: { requestedBy, newDeliveryDate, reason, approved: false, status: "pending" },
      },
    },
    { new: true }
  );

  sentNotificationForExtensionRequest({
    requestedBy: new mongoose.Types.ObjectId(requestedBy),
    receiverId: order.userId,
    serviceType: order.serviceType,
    reason,
  }).catch((err) => console.error('Extension request notification failed:', err));

  return result;
};


const acceptExtensionRequest = async (
  orderId: string,
  extensionRequestId: string,
  approvedBy: string
) => {
  // ✅ Find the order first
  const order = await EventOrder.findById(orderId);
  if (!order) throw new AppError(404, "Event order not found");

  // ✅ Find the requested extension
  const extensionRequest = order.extensionRequests.id(extensionRequestId);
  if (!extensionRequest) {
    throw new AppError(404, "Extension request not found");
  }

  // ✅ Prevent duplicate approvals
  if (extensionRequest.approved) {
    throw new AppError(400, "This extension request has already been approved");
  }

  // ✅ Approve the request and update delivery dates
  extensionRequest.approved = true;
  extensionRequest.status = "accepted";
  order.deliveryDate = extensionRequest.newDeliveryDate;
  order.lastDeliveryDate = extensionRequest.newDeliveryDate;

  // ✅ Save changes
  await order.save();

  sentNotificationForExtensionAccepted({
    acceptedBy: new mongoose.Types.ObjectId(approvedBy),
    receiverId: order.serviceProviderId,
    serviceType: order.serviceType,
    newDeliveryDate: extensionRequest.newDeliveryDate,
  }).catch((err) => console.error('Extension accepted notification failed:', err));

  return order;
};

const rejectExtensionRequest = async (
  orderId: string,
  extensionRequestId: string,
  reason: string
) => {
  // ✅ Find the order first
  const order = await EventOrder.findById(orderId);
  if (!order) throw new AppError(404, "Event order not found");

  // ✅ Find the requested extension
  const extensionRequest = order.extensionRequests.id(extensionRequestId);
  if (!extensionRequest) {
    throw new AppError(404, "Extension request not found");
  }

  // ✅ Prevent duplicate approvals
  if (extensionRequest.status === "accepted" || extensionRequest.status === "reject") {
    throw new AppError(400, "This extension request has already been approved");
  }

  // ✅ Approve the request and update delivery dates
  extensionRequest.approved = true;
  extensionRequest.status = "reject";
  extensionRequest.reason = reason;

  // ✅ Save changes
  await order.save();

  sentNotificationForExtensionRejected({
    rejectedBy: order.userId,
    receiverId: order.serviceProviderId,
    serviceType: order.serviceType,
    reason,
  }).catch((err) => console.error('Extension rejected notification failed:', err));

  return order;
};

const deleteEventOrder = async (id: string) => {
  const result = await EventOrder.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );

  if (!result) throw new Error("EventOrder not found");
  return result;
};



const acceptDirectOrder = async (orderId: string, serviceProviderId: string) => {
  // Find and validate order
  const existingOrder = await EventOrder.findById(orderId).populate("packageId", "title");
  if (!existingOrder) {
    throw new AppError(404, "Event order not found");
  }

  // Only the assigned service provider can accept
  if (existingOrder.serviceProviderId.toString() !== serviceProviderId) {
    throw new AppError(403, "You are not authorized to accept this order");
  }

  if (existingOrder.orderType !== "direct") {
    throw new AppError(400, "Only direct orders can be accepted");
  }

  if (existingOrder.status !== "pending") {
    throw new AppError(400, "Only pending orders can be accepted");
  }

  // Update order
  existingOrder.status = "accepted";
  existingOrder.statusTimestamps.acceptedAt = new Date();

  await existingOrder.save();

  // 🔹 Get package title (if available)
  const packageName =
    existingOrder.packageId && (existingOrder.packageId as any).title
      ? (existingOrder.packageId as any).title
      : undefined;

  // 🚀 Send notification asynchronously (non-blocking)
  sentNotificationForOrderAccepted({
    orderType: "direct",
    userId: existingOrder.serviceProviderId,
    receiverId: existingOrder.userId,
    serviceType: existingOrder.serviceType,
    packageName,
  }).catch((err) => console.error("Failed to send direct accept notification:", err));


  return existingOrder;
};

const acceptCustomOrder = async (
  orderId: string,
  serviceProviderId: string,
  payload: Partial<IEventOrder>
) => {
  
  console.log("payload accepte custom order route =>>> ", payload)
  const { price, priceWithServiceFee, totalPrice, vatAmount, deliveryDate, description } = payload;

  // Validation for required pricing fields
  if (!price || !totalPrice  || !deliveryDate) {
    throw new AppError(
      400,
      "price,  totalPrice, and deliveryDate are required"
    );
  }

  // Find and validate order
  const existingOrder = await EventOrder.findById(orderId).populate("packageId", "title");
  if (!existingOrder) {
    throw new AppError(404, "Event order not found");
  }

  // Only the assigned service provider can accept
  if (existingOrder.serviceProviderId.toString() !== serviceProviderId) {
    throw new AppError(403, "You are not authorized to accept this order");
  }

  if (existingOrder.orderType !== "custom") {
    throw new AppError(400, "Only custom orders can be accepted");
  }

  if (existingOrder.status !== "pending") {
    throw new AppError(400, "Only pending orders can be accepted");
  }

  const basePrice = price || 0;
  const vatPercent = vatAmount || 0;

  // Update order details
  existingOrder.price = price;
  existingOrder.vatAmount = (basePrice * vatPercent) / 100;
  existingOrder.priceWithServiceFee = priceWithServiceFee;
  existingOrder.totalPrice = totalPrice;
  existingOrder.deliveryDate = new Date(deliveryDate);
  existingOrder.lastDeliveryDate = new Date(deliveryDate);
  if (description) existingOrder.description = description;

  existingOrder.status = "accepted";
  existingOrder.statusTimestamps.acceptedAt = new Date();

  await existingOrder.save();

  console.log("existing order =>>>>", existingOrder)

  // 🔹 Get package title (if available)
  const packageName =
    existingOrder.packageId && (existingOrder.packageId as any).title
      ? (existingOrder.packageId as any).title
      : undefined;

  // 🚀 Send notification asynchronously
  sentNotificationForOrderAccepted({
    orderType: "custom",
    userId: existingOrder.serviceProviderId,
    receiverId: existingOrder.userId,
    serviceType: existingOrder.serviceType,
    packageName
  }).catch((err) => console.error("Failed to send custom accept notification:", err));


  return existingOrder;
};

const requestOrderDelivery = async (
  orderId: string,
  serviceProviderId: mongoose.Types.ObjectId) => {
  // 🔹 Find the order
  const order = await EventOrder.findOne({
    _id: orderId,
    serviceProviderId,
    isDeleted: false,
  }).populate("packageId", "title");

  if (!order) {
    throw new AppError(404, "Event order not found or unauthorized");
  }

  // 🔹 Validate current status
  // if (order.status !== "inProgress") {
  //   throw new AppError(400, "You can only send a delivery request for an order that is in progress");
  // }

  // 🔹 Update order status
  order.status = "deliveryRequest";
  order.statusTimestamps = {
    ...order.statusTimestamps,
    deliveryRequestAt: new Date(),
  };
  order.statusHistory.push({
    status: "deliveryRequest",
    changedAt: new Date(),
  });

  await order.save();

  // 🔹 Get package title (if available)
  const packageName =
    order.packageId && (order.packageId as any).title
      ? (order.packageId as any).title
      : undefined;

  // 🔹 Send notification to client
   sentNotificationForDeliveryRequest({
    userId: order.serviceProviderId, // sender = service provider
    receiverId: order.userId, // receiver = client
    orderType: order.orderType,
    serviceType: order.serviceType,
    packageName
  }).catch((err) =>
    console.error("Failed to send delivery request notification:", err)
  );;

  console.log("📦 Delivery request sent successfully:", {
    orderId: order._id,
    clientId: order.userId,
  });

  return order;
};

const acceptDeliveryRequest = async (
  orderId: string,
  userId: string
) => {
  // 🔍 Find and validate order
  const order = await EventOrder.findById(orderId).populate("packageId", "title");
  if (!order) {
    throw new AppError(404, "Order not found");
  }

  // ✅ Ensure the service provider is the assigned one
  if (order.userId.toString() !== userId) {
    throw new AppError(403, "You are not authorized to accept this delivery");
  }

  // ✅ Ensure the order is in delivery-requested state
  if (order.status !== "deliveryRequest") {
    throw new AppError(400, "Delivery can only be accepted when requested");
  }

  // 📝 Update status
  order.status = "delivered";
  order.statusTimestamps.deliveredAt = new Date();

  
  await order.save();
// ================================
// ⭐ CREATE A PENDING REVIEW ENTRY
// ================================
try {
  const existingReview = await Review.findOne({
    userId: order.userId,
    serviceProviderId: order.serviceProviderId,
    eventOrderId: order._id,
  });

  if (!existingReview) {
    await Review.create({
      userId: order.userId,
      serviceProviderId: order.serviceProviderId,
      eventOrderId: order._id,
      rating: 1,                 // no rating yet
      message: "",               // user will update later
      status: "pending",         // ⬅ REVIEW IS PENDING
      isDeleted: false,
    });
  }
} catch (error: any) {
  console.error("Failed to create pending review:", error);
  console.error("Failed to create pending review:", error.message);
  throw new AppError(500, "Unable to create pending review. Please try again later.");
}

  // 🔹 Get package title (if available)
  const packageName =
    order.packageId && (order.packageId as any).title
      ? (order.packageId as any).title
      : undefined;

  // 🚀 Send notification asynchronously
  sentNotificationForDeliveryAccepted({
    orderType: order.orderType,
    userId: order.userId,
    receiverId: order.serviceProviderId,
    serviceType: order.serviceType,
    packageName,
  }).catch((err) =>
    console.error("Failed to send delivery accepted notification:", err)
  );

  return order;
};




const declineOrderRequest = async (
  orderId: string,
  clientId: string,
  reason: string,
  status: "declined" | "deliveryRequestDeclined" // Ensure that the status can only be these two values
) => {
  
  // 1️⃣ Find the order
  const order = await EventOrder.findById(orderId).populate("packageId", "title");
  if (!order) throw new AppError(404, "Order not found");


  // 2️⃣ Only the client can decline
  // if (order.serviceProviderId.toString() !== clientId) {
  //   throw new AppError(403, "You are not authorized to decline this order");
  // }

  // 3️⃣ Only pending or deliveryRequest orders can be declined
  if (!["pending", "deliveryRequest"].includes(order.status)) {
    throw new AppError(400, "Only pending or delivery request orders can be declined");
  }

  // 4️⃣ Update order status based on the provided status value
  if (status === "declined") {
    if (order.serviceProviderId.toString() !== clientId) {
      throw new AppError(403, "You are not authorized to decline this order");
    }


    order.status = "declined";
    order.declineReason = reason;
    order.statusTimestamps.declinedAt = new Date();
  } else if (status === "deliveryRequestDeclined") {
    if (order.userId.toString() !== clientId) {
      throw new AppError(403, "You are not authorized to decline this order");
    }

    order.status = "deliveryRequestDeclined";
    order.deliveryRequestDeclinedReason = reason;
    order.statusTimestamps.deliveryRequestDeclineAt = new Date();
  }

  // 5️⃣ Push the status change to history
  order.statusHistory.push({
    status,
    reason,
    changedAt: new Date(),
  });

  // 6️⃣ Save the order after all updates
  await order.save();

  const receiverId: any =
  status === "declined"
    ? new mongoose.Types.ObjectId(order.userId)
    : status === "deliveryRequestDeclined"
    ? new mongoose.Types.ObjectId(order.serviceProviderId)
    : undefined;

  // Optionally, notify the service provider (uncomment to enable)
  sentNotificationForOrderDeclined({
    orderType: order.orderType,
    userId: new mongoose.Types.ObjectId(clientId), // sender = client
    receiverId, // receiver = service provider
    serviceType: order.serviceType,
    packageName: order.packageId ? order.packageId.title : undefined,
    status,
    reason,
  }).catch((err) => console.error("Notification failed:", err));

  return order;
};

// const cancelOrder = async (
//   orderId: string,
//   userId: string,
//   reason: string, 
//   role: string
// ) => {
//   // 🔍 Find order
//   const order = await EventOrder.findById(orderId)
//     .populate("packageId", "title") as any;

//   if (!order) throw new AppError(404, "Order not found");

//   // 🛑 Check already cancelled
//   if (order.status === "cancelled") {
//     throw new AppError(400, "This order is already cancelled");
//   }

//   if(role !== "admin"){
//   // 🧾 Authorization: only the client or assigned service provider can cancel
//   const isAuthorized =
//     order.userId.toString() === userId ||
//     order.serviceProviderId.toString() === userId;

//   if (!isAuthorized) {
//     throw new AppError(403, "You are not authorized to cancel this order");
//   }
// }

//   // 🚫 Update order status
//   order.status = "cancelled";
//   order.cancelReason = reason;
//   order.cancelledBy = new mongoose.Types.ObjectId(userId);
//   order.statusTimestamps.cancelledAt = new Date();
//   order.statusHistory.push({
//     status: "cancelled",
//     reason,
//     changedAt: new Date(),
//   });

//   await order.save();

//   // 🔔 Send notification to the other party
//   sentNotificationForOrderCancelled({
//     orderType: order.orderType,
//     cancelledBy: new mongoose.Types.ObjectId(userId),
//     receiverId:
//       order.userId.toString() === userId
//         ? order.serviceProviderId
//         : order.userId,
//     serviceType: order.serviceType,
//     packageName: order.packageId?.title,
//   }).catch((err) => console.error("Notification failed:", err));

//   return order;
// };

const cancelRequest = async (orderId: string, userId: string, reason: string) => {

  const order = await EventOrder.findById(orderId);

  if (!order) throw new AppError(404, "Order not found");

  // ✅ Only order user or service provider can request cancellation
  if (
    order.userId.toString() !== userId &&
    order.serviceProviderId.toString() !== userId
  ) {
    throw new AppError(403, "You are not allowed to request cancel for this order");
  }

  if (!["pending", "accepted", "inProgress"].includes(order.status)) {
    throw new AppError(400, "You cannot request cancel at this stage");
  }

  order.status = "cancelRequest";
  order.cancelRequestedBy = userId as any;
  order.cancelReason = reason;

  order.statusTimestamps.cancelRequestAt = new Date();
  order.statusHistory.push({ status: "cancelRequest", changedAt: new Date(), reason });

  await order.save();

  sentNotificationForCancelRequest({
    orderType: order.orderType,
    requestedBy: new mongoose.Types.ObjectId(userId),
    receiverId:
      order.userId.toString() === userId
        ? order.serviceProviderId
        : order.userId,
    serviceType: order.serviceType,
    reason,
  }).catch((err) => console.error("Notification failed:", err));

  return order;
};


const declinedCancelRequest = async (orderId: string, userId: string, reason: string) => {

  console.log({orderId, userId, reason});
  const order = await EventOrder.findById(orderId);

  if (!order) throw new AppError(404, "Order not found");

  if (order.status !== "cancelRequest") {
    throw new AppError(400, "No pending cancel request");
  }

  // ✅ Opposite user only
  if (order.cancelRequestedBy?.toString() === userId) {
    throw new AppError(403, "You cannot decline your own cancel request");
  }

console.log({order})
  if (
    order.userId.toString() !== userId &&
    order.serviceProviderId.toString() !== userId
  ) {
    throw new AppError(403, "You are not allowed to decline cancel for this order");
  }

  order.status = "inProgress";
  order.statusTimestamps.cancelRequestDeclinedAt = new Date();
  order.cancelApprovalDate = new Date();
  order.statusHistory.push({ status: "cancelRequestDeclined", changedAt: new Date(), reason });

  await order.save();

  sentNotificationForCancelRequestDeclined({
    declinedBy: new mongoose.Types.ObjectId(userId),
    receiverId: order.cancelRequestedBy as mongoose.Types.ObjectId,
    serviceType: order.serviceType,
    reason,
  }).catch((err) => console.error('Cancel request declined notification failed:', err));

  return order;
};

const cancelOrder = async (orderId: string, userId: string) => {
  const order = await EventOrder.findById(orderId);

  if (!order) throw new AppError(404, "Order not found");

  if (order.status !== "cancelRequest") {
    throw new AppError(400, "Cancellation not requested yet");
  }

  // ✅ Opposite party only
  if (order.cancelRequestedBy?.toString() === userId) {
    throw new AppError(403, "You cannot approve your own cancel request");
  }

  if (
    order.userId.toString() !== userId &&
    order.serviceProviderId.toString() !== userId
  ) {
    throw new AppError(403, "You are not allowed to cancel this order");
  }

  order.status = "cancelled";
  order.statusTimestamps.cancelledAt = new Date();
  order.cancelApprovalBy = userId as any;
  order.cancelApprovalDate = new Date();

  order.statusHistory.push({ status: "cancelled", changedAt: new Date(), reason: order.cancelReason });

  await order.save();

  sentNotificationForOrderCancelled({
    orderType: order.orderType,
    cancelledBy: new mongoose.Types.ObjectId(userId),
    receiverId: order.cancelRequestedBy as mongoose.Types.ObjectId,
    serviceType: order.serviceType,
  }).catch((err) => console.error('Cancel approved notification failed:', err));

  sentNotificationForRefundRequired({
    cancelledBy: new mongoose.Types.ObjectId(userId),
    orderId: order._id as mongoose.Types.ObjectId,
    serviceType: order.serviceType,
  }).catch((err) => console.error('Admin refund notification failed:', err));

  return order;
};


const cancelEventOrderByAdmin = async (orderId: string, userId: string, reason: string) => {
  const order = await EventOrder.findById(orderId);

  if (!order) throw new AppError(404, "Order not found");

  order.status = "cancelled";
  order.statusTimestamps.cancelledAt = new Date();
  order.cancelApprovalBy = userId as any;
  order.cancelApprovalDate = new Date();


  order.statusHistory.push({ status: "cancelled", changedAt: new Date(), reason });

  await order.save();

  sentNotificationForOrderCancelled({
    orderType: order.orderType,
    cancelledBy: new mongoose.Types.ObjectId(userId),
    receiverId: order.userId,
    serviceType: order.serviceType,
  }).catch((err) => console.error('Admin cancel notification (client) failed:', err));

  sentNotificationForOrderCancelled({
    orderType: order.orderType,
    cancelledBy: new mongoose.Types.ObjectId(userId),
    receiverId: order.serviceProviderId,
    serviceType: order.serviceType,
  }).catch((err) => console.error('Admin cancel notification (professional) failed:', err));

  return order;
};



const getTotalStatsOfSpeceficProfessional = async (serviceProviderId: string) => {
  if (!Types.ObjectId.isValid(serviceProviderId)) {
    throw new Error("Invalid serviceProviderId");
  }

  const now = new Date();

  const data = await EventOrder.aggregate([
    {
      $match: {
        serviceProviderId: new Types.ObjectId(serviceProviderId),
        isDeleted: false,
      }
    },
    {
      $facet: {
        totalCompletedEvents: [
          { $match: { status: "delivered" } },
          { $count: "count" }
        ],
        totalInProgressEvents: [
          { $match: { status: "inProgress", date: { $lte: now }  } },
          { $count: "count" }
        ],
        totalUpcomingEvents: [
          { $match: { status: "inProgress", date: { $gte: now } } },
          { $count: "count" }
        ],
        totalPendingEvents: [
          { $match: { status: "pending" } },
          { $count: "count" }
        ]
      }
    },
    {
      $project: {
        totalCompletedEvents: { $ifNull: [{ $arrayElemAt: ["$totalCompletedEvents.count", 0] }, 0] },
        totalInProgressEvents: { $ifNull: [{ $arrayElemAt: ["$totalInProgressEvents.count", 0] }, 0] },
        totalUpcomingEvents: { $ifNull: [{ $arrayElemAt: ["$totalUpcomingEvents.count", 0] }, 0] },
        totalPendingEvents: { $ifNull: [{ $arrayElemAt: ["$totalPendingEvents.count", 0] }, 0] },
      }
    }
  ]);

  return data[0];
};




const getTotalStatsOfSpecificUser = async (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }

  const data = await EventOrder.aggregate([
    {
      $match: {
        userId: new Types.ObjectId(userId),
        isDeleted: false,
      },
    },
    {
      $facet: {
        totalCurrentOrders: [
          { $match: { status: "inProgress" } },
          { $count: "count" },
        ],
        totalToConfirm: [
          { $match: { status: "deliveryRequest" } },
          { $count: "count" },
        ],
        totalDelivered: [
          { $match: { status: "delivered" } },
          { $count: "count" },
        ],
        totalPendingEvents: [
          { $match: { status: "pending" } },
          { $count: "count" },
        ],
      },
    },
    {
      $project: {
        totalCurrentOrders: {
          $ifNull: [{ $arrayElemAt: ["$totalCurrentOrders.count", 0] }, 0],
        },
        totalToConfirm: {
          $ifNull: [{ $arrayElemAt: ["$totalToConfirm.count", 0] }, 0],
        },
        totalDelivered: {
          $ifNull: [{ $arrayElemAt: ["$totalDelivered.count", 0] }, 0],
        },
        totalPendingEvents: {
          $ifNull: [{ $arrayElemAt: ["$totalPendingEvents.count", 0] }, 0],
        },
      },
    },
  ]);

  return data[0];
};



const getUpcomingEventsOfSpecificProfessional = async (serviceProviderId: string) => {
  if (!Types.ObjectId.isValid(serviceProviderId)) {
    throw new Error("Invalid serviceProviderId");
  }

  const now = new Date();

  const upcomingEvents = await EventOrder.find({
    serviceProviderId: new Types.ObjectId(serviceProviderId),
    status: { $in: ["accepted", "inProgress"] },
    date: { $gte: now },
    isDeleted: false,
  })
    .populate({
      path: "userId",
      select: "name sureName profileImage email phone",
    })
    .populate({
      path: "packageId",
      select: "title price description",
    })
    .sort({ date: 1 }) // sort nearest upcoming first
    .lean();

  return upcomingEvents;
};




const getPendingEventOrders = async ( userId: string,query: Record<string, unknown>) => {
  // ✅ Only fetch pending orders of the specific professional
  const filter = {
    professionalId: userId,
    status: 'pending',
  };

  // ✅ Apply QueryBuilder utilities for pagination, filtering, sorting, etc.
  const eventOrderQuery = new QueryBuilder(EventOrder.find(filter), query)
    .search(['eventName', 'customerName']) // searchable fields
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await eventOrderQuery.modelQuery;
  const meta = await eventOrderQuery.countTotal();

  return { meta, result };
};


const getServiceProviderCalendar = async (
  serviceProviderId: string,
  year: number,
  month: number
) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const events = await EventOrder.aggregate([
    {
      $match: {
        serviceProviderId: new Types.ObjectId(serviceProviderId),
        isDeleted: false,
        status: { $in: ["accepted", "inProgress"] },
        date: { $gte: new Date() },
      },
    },
    {
      $lookup: {
        from: "packages",
        localField: "packageId",
        foreignField: "_id",
        as: "package",
      },
    },
    { $unwind: { path: "$package", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        eventName: {
          $cond: [
            { $eq: ["$orderType", "direct"] },
            "$package.title",
            "",
          ],
        },
      },
    },
    {
      $project: {
        _id: 0,
        title: 1,
        eventName: 1,
        eventDate: "$date",
        status: 1,
        serviceType: 1,
        time: 1
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$eventDate" },
        },
        events: {
          $push: {
            title: "$title",
            eventName: "$eventName",
            eventDate: "$eventDate",
            status: "$status",
            serviceType: "$serviceType",
            eventTime: "$time"
          },
        },
      },
    },
    {
      $project: {
        date: "$_id",
        events: 1,
        _id: 0,
      },
    },
    { $sort: { date: 1 } },
  ]);

  return events;
};

export const EventOrderService = {
  createEventOrder,
  acceptDirectOrder,
  acceptCustomOrder,
  cancelEventOrderByAdmin,
  getEventOrders,
  getMyEventOrders,
  getMyExtensionEventOrders,
  getAllDeliveredOrders,
  getEventOrderById,
  updateEventOrderStatus,
  requestExtension,
  acceptExtensionRequest,
  rejectExtensionRequest,
  deleteEventOrder,
  requestOrderDelivery,
  acceptDeliveryRequest,
  declineOrderRequest,
  cancelOrder,
  getUpcomingEventsOfSpecificProfessional,
  getPendingEventOrders,
  getTotalStatsOfSpeceficProfessional,
  getTotalStatsOfSpecificUser,
  cancelRequest,
  declinedCancelRequest,
  completePaymentEventOrder,
  getServiceProviderCalendar
};





// without use query builder function && previouser function
// const getMyEventOrders = async (
//   userId: string,
//   role: "user" | "professional",
//   tab: string
// ) => {
//   const query: any = { isDeleted: false };

//   // 🎯 Role-based field matching
//   if (role === "professional") query.serviceProviderId = userId;
//   if (role === "user") query.userId = userId;

//   // 🎯 Tab-based filtering logic
//   switch (role) {
//     // ----------------------------
//     // 🧑 For Service Providers
//     // ----------------------------
//     case "professional":
//       switch (tab) {
//         case "delivered":
//           query.status = "delivered";
//           break;

//         case "inProgress":
//           query.status = "inProgress";
//           break;

//         case "upcoming":
//           query.status = "inProgress";
//           query.date = { $gte: new Date() };
//           break;

//         case "pending":
//           query.status = "pending";
//           break;

//         case "cancelled":
//           query.status = "cancelled";
//           break;

//         default:
//           throw new AppError(400, `Invalid tab for professional: ${tab}`);
//       }
//       break;

//     // ----------------------------
//     // 👤 For Regular Users
//     // ----------------------------
//     case "user":
//       switch (tab) {
//         case "currentOrder":
//           query.status = { $in: ["accepted", "inProgress"] };
//           break;

//         case "toConfirm":
//           query.status = "deliveryRequest";
//           break;

//         case "delivered":
//           query.status = "delivered";
//           break;

//         case "pending":
//           query.status = "pending";
//           break;

//         case "orderOffer":
//           query.orderType = "custom";
//           query.status = "accepted";
//           break;

//         case "myOffer":
//           query.orderType = "custom";
//           query.status = { $in: ["pending", "accepted"] };
//           break;

//         case "cancelled":
//           query.status = "cancelled";
//           break;

//         default:
//           throw new AppError(400, `Invalid tab for user: ${tab}`);
//       }
//       break;

//     default:
//       throw new AppError(400, "Invalid role type — must be 'user' or 'professional'");
//   }

//   // 🧠 Execute Query
//   const result = await EventOrder.find(query)
//     .populate("userId", "name profileImage email")
//     .populate("serviceProviderId", "name profileImage email")
//     .populate({
//       path: "packageId",
//       select: "title price",
//       match: { $expr: { $eq: ["$orderType", "direct"] } }, // populate only for direct orders
//     })
//     .sort({ createdAt: -1 })
//     .lean();

//   return result;
// };
