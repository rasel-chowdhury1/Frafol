
import mongoose, { Types } from "mongoose";
import { EventOrder } from "./eventOrder.model";
import { IEventOrder } from "./eventOrder.interface";
import QueryBuilder from "../../builder/QueryBuilder";
import AppError from "../../error/AppError";
import { sentNotificationForOrderCancelled } from "../../../socketIo";

const createEventOrder = async (payload: IEventOrder) => {
    
  console.log("Creating EventOrder with payload:", payload);
  const result = await EventOrder.create(payload);

  // 🚀 Send notification asynchronously (non-blocking)
  // sentNotificationForBookingRequest({
  //   userId: payload.userId,
  //   receiverId: payload.serviceProviderId,
  //   orderType: payload.orderType, // 'direct' | 'custom'
  //   packageName: payload?.packageName, // only for direct order
  //   serviceType: payload?.serviceType, // only for custom order
  // }).catch((err) => {
  //   console.error("Failed to send booking notification:", err.message);
  // });

  return result;
};


const getEventOrders = async (query: Record<string, unknown>) => {
  const eventOrderQuery = new QueryBuilder(EventOrder.find({ isDeleted: false }), query)
    .filter() // apply filters (userId, serviceProviderId, orderType, etc.)
    .search(["orderId", "location", "town", "country"]) // allow searching by these fields
    .sort()
    .paginate()
    .fields();

  const result = await eventOrderQuery.modelQuery
    .populate("userId", "name sureName profileImage role switchRole")
    .populate("serviceProviderId", "name sureName profileImage role switchRole")
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
          baseQuery.status = "inProgress";
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
          baseQuery.status = "inProgress";
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
        default:
          throw new AppError(400, `Invalid tab for user: ${tab}`);
      }
      break;

    default:
      throw new AppError(400, "Invalid role type — must be 'user' or 'professional'");
  }

  // 🧠 Initialize QueryBuilder
  const queryBuilder = new QueryBuilder(
    EventOrder.find(baseQuery)
      .populate("userId", "name profileImage email")
      .populate("serviceProviderId", "name profileImage email")
      .populate({
        path: "packageId",
        select: "title price",
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

  // ✅ Optional: send notification or email to user
  // await sendExtensionApprovedNotification(order.userId, order.serviceProviderId, extensionRequest.newDeliveryDate);

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

  // ✅ Optional: send notification or email to user
  // await sendExtensionApprovedNotification(order.userId, order.serviceProviderId, extensionRequest.newDeliveryDate);

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
  // sentNotificationForOrderAccepted({
  //   orderType: "direct",
  //   userId: existingOrder.serviceProviderId,
  //   receiverId: existingOrder.userId,
  //   serviceType: existingOrder.serviceType,
  //   packageName,
  // }).catch((err) => console.error("Failed to send direct accept notification:", err));


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
  if (!price || !vatAmount || !totalPrice  || !deliveryDate) {
    throw new AppError(
      400,
      "price, vatAmount, totalPrice, and deliveryDate are required"
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
  // sentNotificationForOrderAccepted({
  //   orderType: "custom",
  //   userId: existingOrder.serviceProviderId,
  //   receiverId: existingOrder.userId,
  //   serviceType: existingOrder.serviceType,
  //   packageName
  // }).catch((err) => console.error("Failed to send custom accept notification:", err));


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
  //  sentNotificationForDeliveryRequest({
  //   userId: order.serviceProviderId, // sender = service provider
  //   receiverId: order.userId, // receiver = client
  //   orderType: order.orderType,
  //   serviceType: order.serviceType,
  //   packageName
  // }).catch((err) =>
  //   console.error("Failed to send delivery request notification:", err)
  // );;

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

  // 🔹 Get package title (if available)
  const packageName =
    order.packageId && (order.packageId as any).title
      ? (order.packageId as any).title
      : undefined;

  // 🚀 Send notification asynchronously
  // sentNotificationForDeliveryAccepted({
  //   orderType: order.orderType,
  //   userId: order.userId,
  //   receiverId: order.serviceProviderId,
  //   serviceType: order.serviceType,
  //   packageName,
  // }).catch((err) =>
  //   console.error("Failed to send delivery accepted notification:", err)
  // );

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

  // Optionally, notify the service provider (uncomment to enable)
  // sentNotificationForOrderDeclined({
  //   orderType: order.orderType,
  //   userId: new mongoose.Types.ObjectId(clientId), // sender = client
  //   receiverId: new mongoose.Types.ObjectId(order.serviceProviderId), // receiver = service provider
  //   serviceType: order.serviceType,
  //   packageName: order.packageId ? order.packageId.title : undefined,
  // }).catch((err) => console.error("Notification failed:", err));

  return order;
};

const cancelOrder = async (
  orderId: string,
  userId: string,
  reason: string, 
  role: string
) => {
  // 🔍 Find order
  const order = await EventOrder.findById(orderId)
    .populate("packageId", "title") as any;

  if (!order) throw new AppError(404, "Order not found");

  // 🛑 Check already cancelled
  if (order.status === "cancelled") {
    throw new AppError(400, "This order is already cancelled");
  }

  if(role !== "admin"){
  // 🧾 Authorization: only the client or assigned service provider can cancel
  const isAuthorized =
    order.userId.toString() === userId ||
    order.serviceProviderId.toString() === userId;

  if (!isAuthorized) {
    throw new AppError(403, "You are not authorized to cancel this order");
  }
}

  // 🚫 Update order status
  order.status = "cancelled";
  order.cancelReason = reason;
  order.cancelledBy = new mongoose.Types.ObjectId(userId);
  order.statusTimestamps.cancelledAt = new Date();
  order.statusHistory.push({
    status: "cancelled",
    reason,
    changedAt: new Date(),
  });

  await order.save();

  // 🔔 Send notification to the other party
  sentNotificationForOrderCancelled({
    orderType: order.orderType,
    cancelledBy: new mongoose.Types.ObjectId(userId),
    receiverId:
      order.userId.toString() === userId
        ? order.serviceProviderId
        : order.userId,
    serviceType: order.serviceType,
    packageName: order.packageId?.title,
  }).catch((err) => console.error("Notification failed:", err));

  return order;
};

// const getTotalStatsOfSpeceficProfessional = async (serviceProviderId: string) => {
//   if (!Types.ObjectId.isValid(serviceProviderId)) {
//     throw new Error("Invalid serviceProviderId");
//   }

//   const totalComp

// }



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


export const EventOrderService = {
  createEventOrder,
  acceptDirectOrder,
  acceptCustomOrder,
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
  getPendingEventOrders
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
