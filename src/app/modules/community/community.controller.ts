import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { CommunityService } from "./community.service";
import { storeFiles } from "../../utils/fileHelper";

const createCommunity = catchAsync(async (req: Request, res: Response) => {
  req.body.authorId = req.user.userId;

    if (req.files) {
    try {
      // Use storeFiles to process all uploaded files
      const filePaths = storeFiles(
        'community',
        req.files as { [fieldName: string]: Express.Multer.File[] },
      );

      // Set photos (multiple files)
      if (filePaths.images && filePaths.images.length > 0) {
        req.body.images = filePaths.images; // Assign full array of photos
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

  const result = await CommunityService.createCommunity(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Community created successfully",
    data: result,
  });
});

const getAllCommunities = catchAsync(async (req: Request, res: Response) => {
  const result = await CommunityService.getAllCommunities(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Communities retrieved successfully",
    data: result,
  });
});

const getCommunityById = catchAsync(async (req: Request, res: Response) => {
  const result = await CommunityService.getCommunityById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Community retrieved successfully",
    data: result,
  });
});

const updateCommunity = catchAsync(async (req: Request, res: Response) => {


 if (req.files) {
    try {
      // Use storeFiles to process all uploaded files
      const filePaths = storeFiles(
        'marketPlace',
        req.files as { [fieldName: string]: Express.Multer.File[] },
      );

      // Set photos (multiple files)
      if (filePaths.images && filePaths.images.length > 0) {
        req.body.images = filePaths.images; // Assign full array of photos
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
  const result = await CommunityService.updateCommunity(req.params.id, req.user.userId, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Community updated successfully",
    data: result,
  });
});

const deleteCommunity = catchAsync(async (req: Request, res: Response) => {
  const result = await CommunityService.deleteCommunity(req.params.id, req.user.userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Community deleted successfully",
    data: null,
  });
});

export const CommunityController = {
  createCommunity,
  getAllCommunities,
  getCommunityById,
  updateCommunity,
  deleteCommunity,
};
