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

    // ✅ Correct delivery date calculation
    const deliveryDate = new Date(
      orderDate.getTime() + (packageData.deliveryTime || 0) * 24 * 60 * 60 * 1000
    );

    req.body.deliveryDate = deliveryDate;
    req.body.lastDeliveryDate = deliveryDate;
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
    const validServiceTypes = ["photography", "videography"];
    if (!validServiceTypes.includes(serviceType)) {
      throw new AppError(
        400,
        "Invalid serviceType — must be photography or videography"
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
      if (!req.body.name || !req.body.sureName) {
        throw new AppError(
          400,
          "name and sureName are required when not registered as company"
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
  const { orderId } = req.params;
  const { reason } = req.body;
  const { userId } = req.user;

  if (!userId) {
    throw new AppError(401, "Unauthorized: User ID is missing");
  }

  const result = await EventOrderService.declineOrderRequest(orderId, userId, reason);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order request declined successfully",
    data: result,
  });
});

const cancelOrder = catchAsync(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { reason } = req.body;
  const { userId } = req.user;

  if (!userId) throw new AppError(401, "Unauthorized");

  const result = await EventOrderService.cancelOrder(orderId, userId, reason);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order cancelled successfully",
    data: result,
  });
});


export const EventOrderController = {
  createEventOrder,
  getAllEventOrders,
  getMyEventOrders,
  getEventOrderById,
  getAllDeliveredOrders,
  updateEventOrderStatus,
  requestExtension,
  deleteEventOrder,
  acceptCustomOrder,  
  acceptDirectOrder,
  requestOrderDelivery,
  acceptDeliveryRequest,
  declineOrderRequest,
  cancelOrder
};
