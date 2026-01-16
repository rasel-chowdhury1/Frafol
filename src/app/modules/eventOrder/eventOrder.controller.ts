import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { EventOrderService } from "./eventOrder.service";
import { Package } from "../package/package.model";
import AppError from "../../error/AppError";
import { v4 as uuidv4 } from "uuid";
import moment from "moment";
import { EventOrder } from "./eventOrder.model";

// 🧾 Create new event order (direct/custom)
const createEventOrder = catchAsync(async (req: Request, res: Response) => {
  req.body.userId = req.user.userId; // current logged user

  const { orderType } = req.body;

  if (!orderType) {
    throw new AppError(400, "orderType is required (direct/custom)");
  }


  console.log("body data =>> ", req.body);
  // ==============================
  // 🎯 DIRECT ORDER LOGIC
  // ==============================
  if (orderType === "direct") {
    if (!req.body.packageId) {
      throw new AppError(400, "packageId is required for direct orders");
    }

    const packageData = await Package.findById(req.body.packageId);

    if (!packageData) {
      throw new AppError(404, "Invalid packageId — package not found");
    }

    const basePrice = packageData.price || 0;
    const vatPercent = packageData.vatAmount || 0;
    // auto-fill fields from package
    req.body.serviceProviderId = packageData.authorId;
    req.body.serviceType = packageData.category;
    req.body.packageName = packageData.title;
    req.body.price = basePrice;
    req.body.mainPrice = packageData.mainPrice;
    req.body.vatAmount = (basePrice * vatPercent) / 100;
    req.body.totalPrice = req.body.mainPrice;
      // ✅ Ensure date is valid
    const orderDate = new Date(req.body.date || new Date());
    req.body.date = orderDate;

    console.log("body data for direct =>> ", req.body)
    console.log("package data for direct =>>> ", packageData)

    // ✅ Correct delivery date calculation
    const deliveryDate = new Date(
      orderDate.getTime() + (packageData.deliveryTime || 0) * 24 * 60 * 60 * 1000
    );

    req.body.deliveryDate = deliveryDate;
    req.body.lastDeliveryDate = deliveryDate;

     console.log("body data for direct after=>> ", req.body);
    }

  // ==============================
  // 🛠️ CUSTOM ORDER LOGIC
  // ==============================
  else if (orderType === "custom") {
    const {
      serviceProviderId,
      serviceType,
      isRegisterAsCompany,
    } = req.body;

    // validation for required fields
    if (!serviceProviderId || !serviceType ) {
      throw new AppError(
        400,
        "serviceProviderId, serviceType are required for custom orders"
      );
    }

    // validate serviceType enum
    const validServiceTypes = ["photography", "videography", "both"];
    if (!validServiceTypes.includes(serviceType)) {
      throw new AppError(
        400,
        "Invalid serviceType — must be photography, videography or both"
      );
    }

    // Validate company info if applicable
    if (isRegisterAsCompany) {
      if (!req.body.companyName || !req.body.ICO || !req.body.DIC) {
        throw new AppError(
          400,
          "companyName, ICO, and DIC are required when isRegisterAsCompany is true"
        );
      }
    } else {
      if (!req.body.name ) {
        throw new AppError(
          400,
          "name are required when not registered as company"
        );
      }
    }

    req.body.date = req.body.date ? new Date(req.body.date) : new Date();


  }

  // ==============================
  // ❌ INVALID ORDER TYPE
  // ==============================
  else {
    throw new AppError(400, "Invalid orderType — must be direct or custom");
  }

  // assign unique orderId
  // req.body.orderId = uuidv4();

    // ==============================
  // 🔢 Generate Custom Order ID
  // ==============================
  const today = moment().format("YYYYMMDD");
  const prefix = "EVT";

  // Count today's orders
  const orderCount = await EventOrder.countDocuments({
    createdAt: {
      $gte: moment().startOf("day").toDate(),
      $lte: moment().endOf("day").toDate(),
    },
  });

  // Increment by 1 and pad to 4 digits
  const sequence = String(orderCount + 1).padStart(4, "0");
  const customOrderId = `${prefix}-${today}-${sequence}`;
  req.body.orderId = customOrderId;

  // create new order
  const result = await EventOrderService.createEventOrder(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Event order created successfully",
    data: result,
  });
});


const completePaymentEventOrder = catchAsync(async (req, res) => {
  const { eventOrderId } = req.params;

  const result = await EventOrderService.completePaymentEventOrder(eventOrderId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Event order payment completed successfully",
    data: result,
  });
});


// 📜 Get all event orders (supports pagination, filtering, search)
const getAllEventOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await EventOrderService.getEventOrders(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Event orders retrieved successfully",
    meta: result.meta,
    data: result.result,
  });
});

const getMyEventOrders = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId; // assuming JWT middleware adds req.user
  const { role, tab,...rest } = req.query;

  if (!userId) {
    throw new Error("Unauthorized: User ID missing from token");
  }

  if (!role || !tab) {
    throw new Error("Missing role or tab query parameter");
  }

  const result = await EventOrderService.getMyEventOrders(
    userId.toString(),
    role as "user" | "professional",
    tab as string,
    rest
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Orders retrieved successfully",
    data: result,
  });
  
});

const getMyExtensionEventOrders = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId; 

  if (!userId) {
    throw new Error("Unauthorized: User ID missing from token");
  }



  const result = await EventOrderService.getMyExtensionEventOrders(
    userId.toString()
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Extension request orders retrieved successfully",
    data: result,
  });
  
});



// 🔍 Get a single event order by ID
const getEventOrderById = catchAsync(async (req: Request, res: Response) => {
  const result = await EventOrderService.getEventOrderById(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Event order retrieved successfully",
    data: result,
  });
});

const getAllDeliveredOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await EventOrderService.getAllDeliveredOrders(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Delivered orders retrieved successfully",
    data: result,
  });
});


// 🔄 Update order status (pending, accepted, inProgress, delivered, cancelled)
const updateEventOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const { status } = req.body;
  const result = await EventOrderService.updateEventOrderStatus(req.params.id, status);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order status updated successfully",
    data: result,
  });
});

// ⏳ Request delivery extension
const requestExtension = catchAsync(async (req: Request, res: Response) => {
  const { newDeliveryDate, reason } = req.body;

 console.log("body request extension data =>>>> ", req.body)
  const result = await EventOrderService.requestExtension(
    req.params.id,
    req.user.userId,
    new Date(newDeliveryDate),
    reason
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Delivery extension request submitted successfully",
    data: result,
  });
});
// ✅ Accept extension request
const acceptExtensionRequest = catchAsync(async (req: Request, res: Response) => {
  const { extensionRequestId } = req.body; // ID of the specific extension request to approve

  const result = await EventOrderService.acceptExtensionRequest(
    req.params.orderId, // orderId
    extensionRequestId,
    req.user.userId
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Delivery extension request accepted successfully",
    data: result,
  });
});

// ✅ Reject extension request
const rejectExtensionRequest = catchAsync(async (req: Request, res: Response) => {
  const { extensionRequestId, reason } = req.body; // ID of the specific extension request to approve

  const result = await EventOrderService.rejectExtensionRequest(
    req.params.orderId, // orderId
    extensionRequestId,
    reason
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Reject extension request accepted successfully",
    data: result,
  });
});

// 🗑️ Soft delete order
const deleteEventOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await EventOrderService.deleteEventOrder(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Event order deleted successfully",
    data: result,
  });
});


const acceptCustomOrder = catchAsync(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const {userId} = req.user;

  if (!userId) {
    throw new AppError(401, "Unauthorized: User ID is missing");
  }

  const result = await EventOrderService.acceptCustomOrder(orderId, userId, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Custom event order accepted successfully",
    data: result,
  });
});

const acceptDirectOrder = catchAsync(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const {userId} = req.user;  
  if (!userId) {
    throw new AppError(401, "Unauthorized: User ID is missing");
  }
  const result = await EventOrderService.acceptDirectOrder(orderId, userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Direct event order accepted successfully",
    data: result,
  });
});

const requestOrderDelivery = catchAsync(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const {userId} = req.user; 

  if (!userId) {
    throw new AppError(401, "Unauthorized: User ID is missing");
  }

  const result = await EventOrderService.requestOrderDelivery(orderId, userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Delivery request sent successfully",
    data: result,
  });
});

const acceptDeliveryRequest = catchAsync(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const {userId} = req.user; 

  if (!userId) {
    throw new AppError(401, "Unauthorized: User ID is missing");
  }

  const result = await EventOrderService.acceptDeliveryRequest(orderId, userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Delivery request accepted successfully",
    data: result,
  });
});

const declineOrderRequest = catchAsync(async (req: Request, res: Response) => {
  // Destructuring the necessary parameters and body from the request
  const { orderId } = req.params;
  const { reason, status } = req.body;
  const { userId } = req.user;

  // 1️⃣ Ensure userId is provided and valid
  if (!userId) {
    throw new AppError(401, "Unauthorized: User ID is missing");
  }

  // 2️⃣ Validate that required fields exist
  if (!orderId || !reason || !status) {
    throw new AppError(400, "Missing required fields: orderId, reason, or status");
  }

  // 3️⃣ Ensure status is either 'declined' or 'deliveryRequestDeclined' (based on your logic)
  if (!["declined", "deliveryRequestDeclined"].includes(status)) {
    throw new AppError(400, "Invalid status. Must be 'declined' or 'deliveryRequestDeclined'");
  }

  // 4️⃣ Call the service to decline the order
  const result = await EventOrderService.declineOrderRequest(orderId, userId, reason, status);

  // 5️⃣ Return a success response
sendResponse(res, {
  statusCode: 200,
  success: true,
  message: status === "declined"
    ? "The order request has been successfully declined. The status of the order has been updated to 'Declined'."
    : "The delivery request has been successfully declined. The status of the delivery request has been updated to 'Delivery Request Declined'.",
  data: result,
});
});

const cancelRequest = catchAsync(async (req, res) => {
  const { orderId } = req.params; // orderId
  const { reason } = req.body;
  const userId = req.user.userId;

  const result = await EventOrderService.cancelRequest(orderId, userId, reason);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Cancel request submitted successfully",
    data: result,
  });
});

const declineCancelRequest = catchAsync(async (req, res) => {
  const { orderId } = req.params; // orderId
  const { reason } = req.body;
  const userId = req.user.userId;

  const result = await EventOrderService.declinedCancelRequest(orderId, userId, reason);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Cancel request declined successfully",
    data: result,
  });
});

const approveCancelOrder = catchAsync(async (req, res) => {
  const { orderId } = req.params; // orderId
  const userId = req.user.userId;

  const result = await EventOrderService.cancelOrder(orderId, userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order cancelled successfully",
    data: result,
  });
});

const cancelEventOrderByAdmin = catchAsync(async (req, res) => {
  const { orderId } = req.params; // orderId
  const { reason } = req.body;
  const userId = req.user.userId;

  const result = await EventOrderService.cancelEventOrderByAdmin(orderId, userId, reason);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order cancelled successfully",
    data: result,
  })

})

// const cancelOrder = catchAsync(async (req: Request, res: Response) => {
//   const { orderId } = req.params;
//   const { reason } = req.body;
//   const { userId, role } = req.user;

//   if (!userId) throw new AppError(401, "Unauthorized");

//   const result = await EventOrderService.cancelOrder(orderId, userId, reason, role);

//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: "Order cancelled successfully",
//     data: result,
//   });
// });


const getUpcomingEventsOfSpecificProfessional = catchAsync(async (req: Request, res: Response) => {
  const { userId: serviceProviderId } = req.user;

  const result = await EventOrderService.getUpcomingEventsOfSpecificProfessional(serviceProviderId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Upcoming events fetched successfully",
    data: result,
  });
});


const getPendingEventOrders = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId; // ✅ Authenticated professional user
  const result = await EventOrderService.getPendingEventOrders( userId, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Pending event orders retrieved successfully',
    meta: result.meta,
    data: result.result,
  });
});




const getTotalStatsOfSpeceficProfessional = catchAsync(async (req: Request, res: Response) => {
  const { userId: serviceProviderId } = req.user;

  const result = await EventOrderService.getTotalStatsOfSpeceficProfessional(serviceProviderId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Professional statistics fetched successfully",
    data: result,
  });
});

const getTotalStatsOfSpeceficUser = catchAsync(async (req: Request, res: Response) => {
  const { userId: serviceProviderId } = req.user;

  const result = await EventOrderService.getTotalStatsOfSpecificUser(serviceProviderId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User statistics fetched successfully",
    data: result,
  });

});

// GET /api/v1/event-order/calendar
const getServiceProviderCalendar = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.user;
    const yearQuery = req.query.year as string | undefined;
    const monthQuery = req.query.month as string | undefined;

    if (!userId) {
      throw new AppError(400, "Service provider ID is required");
    }

    const now = new Date();

    // Default to current year/month if not provided
    const year = yearQuery ? parseInt(yearQuery, 10) : now.getFullYear();
    const month = monthQuery ? parseInt(monthQuery, 10) : now.getMonth() + 1; // JS months are 0-indexed

    const calendar = await EventOrderService.getServiceProviderCalendar(
      userId,
      year,
      month
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Service provider calendar fetched successfully",
      data: calendar,
    });
  }
);


export const EventOrderController = {
  createEventOrder,
  getAllEventOrders,
  getMyEventOrders,
  getEventOrderById,
  getAllDeliveredOrders,
  updateEventOrderStatus,
  requestExtension,
  getMyExtensionEventOrders,
  acceptExtensionRequest,
  rejectExtensionRequest,
  deleteEventOrder,
  acceptCustomOrder,  
  acceptDirectOrder,
  requestOrderDelivery,
  acceptDeliveryRequest,
  declineOrderRequest,
  // cancelOrder,
  getUpcomingEventsOfSpecificProfessional,
  getPendingEventOrders,
  getTotalStatsOfSpeceficProfessional,
  getTotalStatsOfSpeceficUser,
  cancelRequest,
  cancelEventOrderByAdmin,
  declineCancelRequest,
  approveCancelOrder,
  completePaymentEventOrder,
  getServiceProviderCalendar
};
