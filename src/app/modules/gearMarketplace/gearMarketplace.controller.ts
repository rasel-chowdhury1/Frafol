import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { GearMarketplaceService } from "./gearMarketplace.service";
import { storeFiles } from "../../utils/fileHelper";
import { ApprovalStatus } from "./gearMarketplace.interface";
import httpStatus from 'http-status';

const createGearMarketplace = catchAsync(async (req: Request, res: Response) => {
  req.body.authorId = req.user.userId; // logged in user


  if (req.files) {
    try {
      // Use storeFiles to process all uploaded files
      const filePaths = storeFiles(
        'marketPlace',
        req.files as { [fieldName: string]: Express.Multer.File[] },
      );

      // Set photos (multiple files)
      if (filePaths.gallery && filePaths.gallery.length > 0) {
        req.body.gallery = filePaths.gallery; // Assign full array of photos
      }

    } catch (error: any) {
      console.error('Error processing files:', error.message);
      return sendResponse(res, {
        statusCode: httpStatus.BAD_REQUEST,
        success: false,
        message: 'Failed to process uploaded files',
        data: null,
      });
    }
  }


  const result = await GearMarketplaceService.createGearMarketplace(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Gear Marketplace item created successfully",
    data: result,
  });
});

const getAllGearMarketplaces = catchAsync(async (req: Request, res: Response) => {

    // Clean query
  const cleanedQuery: Record<string, any> = {};
  Object.entries(req.query).forEach(([key, value]) => {
    if (
      value !== "" &&
      value !== "null" &&
      value !== null &&
      value !== undefined
    ) {
      cleanedQuery[key] = value;
    }
  });
  const result = await GearMarketplaceService.getAllGearMarketplaces(cleanedQuery);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Gear Marketplace items retrieved successfully",
    data: result,
  });
});


const getMyGearMarketplaces = catchAsync(async (req: Request, res: Response) => {
  const result = await GearMarketplaceService.getMyGearMarketplaces(req.user.userId, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "My gear Marketplace items retrieved successfully",
    data: result,
  });
});


const getGearMarketplaceById = catchAsync(async (req: Request, res: Response) => {
  const result = await GearMarketplaceService.getGearMarketplaceById(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Gear Marketplace item retrieved successfully",
    data: result,
  });
});


const getPendingGearMarketplace = catchAsync(async (req, res) => {
  const result = await GearMarketplaceService.getPendingGearMarketplace(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'All pending gear marketplace items fetched successfully',
    meta: result.meta,
    data: result.result,
  });
});



const updateGearMarketplace = catchAsync(async (req: Request, res: Response) => {

    if (req.files) {
    try {
      // Use storeFiles to process all uploaded files
      const filePaths = storeFiles(
        'marketPlace',
        req.files as { [fieldName: string]: Express.Multer.File[] },
      );

      // Set photos (multiple files)
      if (filePaths.gallery && filePaths.gallery.length > 0) {
        req.body.gallery = filePaths.gallery; // Assign full array of photos
      }

    } catch (error: any) {
      console.error('Error processing files:', error.message);
      return sendResponse(res, {
        statusCode: httpStatus.BAD_REQUEST,
        success: false,
        message: 'Failed to process uploaded files',
        data: null,
      });
    }
  }

  const {approvalStatus,...rest} = req.body;

  const result = await GearMarketplaceService.updateGearMarketplace(
    req.params.id,
    req.user.userId,
    rest
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Gear Marketplace item updated successfully",
    data: result,
  });
});



const updateApprovalStatusByAdmin = catchAsync(async (req: Request, res: Response) => {

  const {approvalStatus} = req.body as { approvalStatus: ApprovalStatus };
  
    if (!approvalStatus) {
      sendResponse(res, {
        statusCode: httpStatus.BAD_REQUEST,
        success: false,
        message: "approvalStatus is required",
        data: null,
      });
    }

  const result = await GearMarketplaceService.updateApprovalStatusByAdmin(
    req.params.id,
    approvalStatus
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Approval status updated successfully",
    data: result,
  });
});

const declineGearById = catchAsync(async (req: Request, res: Response) => {

  const {reason} = req.body as { reason: string };
  
    if (!reason) {  
      sendResponse(res, {
        statusCode: httpStatus.BAD_REQUEST,
        success: false,   
        message: "reason is required",
        data: null,
      });
    } 
  const result = await GearMarketplaceService.declineGearById(
    req.params.id,
    reason
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Gear item declined successfully",
    data: result,
  });
});

const deleteGearMarketplace = catchAsync(async (req: Request, res: Response) => {

  

  await GearMarketplaceService.deleteGearMarketplace(req.params.id, req.user.userId, req.user.role);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Gear Marketplace item deleted successfully",
    data: null,
  });
});

export const GearMarketplaceController = {
  createGearMarketplace,
  getAllGearMarketplaces,
  getGearMarketplaceById,
  updateGearMarketplace,
  deleteGearMarketplace,
  getMyGearMarketplaces,
  updateApprovalStatusByAdmin,
  getPendingGearMarketplace,
  declineGearById
};
