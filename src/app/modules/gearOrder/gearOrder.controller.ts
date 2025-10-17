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

const getAllGearOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await GearOrderService.getAllGearOrders();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Gear orders retrieved successfully',
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
  getAllGearOrders,
  getGearOrderById,
  updateGearOrder,
  deleteGearOrder,
};
