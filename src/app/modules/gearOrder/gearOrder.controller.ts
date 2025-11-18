import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { GearOrderService } from './gearOrder.service';
import { GearMarketplace } from '../gearMarketplace/gearMarketplace.model';
import mongoose from 'mongoose';

const createGearOrder = catchAsync(async (req: Request, res: Response) => {

  req.body.clientId = req.user.userId;

  const {gearMarketplaceId} = req.body;

  if(gearMarketplaceId){
    const isExistGearMarketPlace = await GearMarketplace.findById(gearMarketplaceId);

    if(isExistGearMarketPlace){
        req.body.sellerId = isExistGearMarketPlace.authorId;
    }
  }

  const result = await GearOrderService.createGearOrder(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Gear order created successfully',
    data: result,
  });
});


const createGearOrders = catchAsync(async (req: Request, res: Response) => {
    // ✅ Set the current logged-in user as client
    req.body.userId = req.user.userId;

    const { gearMarketPlaceIds } = req.body;

    if (!gearMarketPlaceIds || !gearMarketPlaceIds.length) {
      sendResponse(res, {
        statusCode: httpStatus.BAD_REQUEST,
        success: false,
        message: "No gear marketplace IDs provided",
        data: ""
      });
    }



    // ✅ Call service to create multiple gear orders and payment session
    const result = await GearOrderService.createGearOrders(req.body);

    // ✅ Send standardized response
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Gear orders created successfully",
      data: result,
    });
  }
);


const completePaymentGearOrder = catchAsync(async (req, res) => {
  const { gearOrderId } = req.params;

  const result = await GearOrderService.completePaymentGearOrderById(gearOrderId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Gear order payment marked as received",
    data: result,
  });
});



const getAllGearOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await GearOrderService.getAllGearOrders(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Gear orders retrieved successfully',
    data: result,
  });
});

const getMyGearOrders = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId; // assuming JWT middleware adds req.user
  const { role, tab,...rest } = req.query;

  if (!userId) {
    throw new Error("Unauthorized: User ID missing from token");
  }

  if (!role ) {
    throw new Error("Missing role  query parameter");
  }

  const result = await GearOrderService.getMyGearOrders(
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

const getGearOrderById = catchAsync(async (req: Request, res: Response) => {
  const result = await GearOrderService.getGearOrderById(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Gear order retrieved successfully',
    data: result,
  });
});

const updateGearOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await GearOrderService.updateGearOrder(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Gear order updated successfully',
    data: result,
  });
});

const deleteGearOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await GearOrderService.deleteGearOrder(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Gear order deleted successfully',
    data: result,
  });
});


// ========================================
// 🔹 Seller requests delivery
// ========================================
const requestGearMarketplaceDelivery = async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const sellerId = req.user.userId; // seller's ID from auth

  const result = await GearOrderService.requestGearMarketplaceDelivery(orderId, new mongoose.Types.ObjectId(sellerId));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Delivery request sent successfully",
    data: result,
  });
};


// ========================================
// Client accepts delivery request
// ========================================
const acceptGearDeliveryRequest = async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const clientId = req.user.userId;

  const result = await GearOrderService.acceptDeliveryRequestByClient(
    orderId,
    new mongoose.Types.ObjectId(clientId)
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Delivery request accepted successfully",
    data: result,
  });
};

// ========================================
// Client declines delivery request
// ========================================
const declineGearDeliveryRequest = async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { reason } = req.body;
  const clientId = req.user.userId;

  const result = await GearOrderService.declineDeliveryRequestByClient(
    orderId,
    new mongoose.Types.ObjectId(clientId),
    reason
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Delivery request declined",
    data: result,
  });
};

// ========================================
// Seller cancels the order
// ========================================
const cancelGearOrderBySeller = async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { reason } = req.body;
  const sellerId = req.user.userId;
  const role = req.user.role;

  const result = await GearOrderService.cancelGearOrderBySeller(
    orderId,
    new mongoose.Types.ObjectId(sellerId),
    role,
    reason
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Gear order cancelled successfully",
    data: result,
  });
};

export const GearOrderController = {
  createGearOrder,
  createGearOrders,
  getAllGearOrders,
  getMyGearOrders,
  getGearOrderById,
  updateGearOrder,
  deleteGearOrder,
  requestGearMarketplaceDelivery,
  acceptGearDeliveryRequest,
  declineGearDeliveryRequest,
  cancelGearOrderBySeller,
  completePaymentGearOrder
};
