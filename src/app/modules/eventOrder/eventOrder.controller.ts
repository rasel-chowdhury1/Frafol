import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { EventOrderService } from "./eventOrder.service";
import { Package } from "../package/package.model";
import AppError from "../../error/AppError";
import { v4 as uuidv4 } from "uuid";

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
    req.body.price = basePrice;
    req.body.vatAmount = (basePrice * vatPercent) / 100;
    req.body.totalPrice = req.body.price + req.body.vatAmount;
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
      price,
      deliveryDate,
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
  req.body.orderId = uuidv4();

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

export const EventOrderController = {
  createEventOrder,
  getAllEventOrders,
  getEventOrderById,
  updateEventOrderStatus,
  requestExtension,
  deleteEventOrder,
};
