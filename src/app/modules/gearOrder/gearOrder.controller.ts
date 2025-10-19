import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { GearOrderService } from './gearOrder.service';
import { GearMarketplace } from '../gearMarketplace/gearMarketplace.model';

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

const getAllGearOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await GearOrderService.getAllGearOrders();
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

export const GearOrderController = {
  createGearOrder,
  createGearOrders,
  getAllGearOrders,
  getMyGearOrders,
  getGearOrderById,
  updateGearOrder,
  deleteGearOrder,
};
