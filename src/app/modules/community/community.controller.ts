import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { CommunityService } from "./community.service";
import { storeFiles } from "../../utils/fileHelper";
import httpStatus from 'http-status';

const createCommunity = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;

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

  const data = await CommunityService.createCommunity({
    ...req.body,
    authorId: userId,
  });

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Community post created successfully",
    data,
  });
});

const getAllApproved = catchAsync(async (req: Request, res: Response) => {
  const {userId, role} = req.user;
  const data = await CommunityService.getAllCommunities(userId, role, req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Approved community posts fetched successfully",
    data,
  });
});

const getMyPosts = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const data = await CommunityService.getMyPosts(userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Your community posts fetched successfully",
    data,
  });
});

const getCommunityDetails = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;          // Community ID from URL
  const userId = req.user.userId;     // Logged-in user

  // Call service to get enriched community data
  const community = await CommunityService.getCommunityById(userId, id);

  if (!community) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: "Community not found",
      data: null,
    });
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Community details retrieved successfully",
    data: community,
  });
});

const getPendingCommunities = catchAsync(async (req: Request, res: Response) => {
  const result = await CommunityService.getPendingCommunities(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Pending communities retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getCommentsById = catchAsync(async (req, res) => {
  const { id } = req.params;          // Community ID from URL
  const userId = req.user.userId;

  const result = await CommunityService.getCommentsById(
    id,
    userId
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Comments retrieved successfully",
    data: result,
  });
});


const updateCommunity = catchAsync(async (req: any, res: any) => {
  const { id } = req.params;
  const userId = req.user.userId;

  const payload = req.body;

payload.deleteImages = payload.deleteImages ?? [];

  // ✅ Handle uploaded images (if provided)
  if (req.files) {
    const filePaths = storeFiles(
      "community",
      req.files as { [fieldName: string]: Express.Multer.File[] }
    );

    if (filePaths.images?.length) {
      payload.images = filePaths.images;
    }
  }

  const result = await CommunityService.updateCommunity(
    id,
    userId,
    payload
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Community post updated successfully",
    data: result,
  });

});

const adminGetAll = catchAsync(async (req: Request, res: Response) => {
  const data = await CommunityService.adminGetAll();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "All community posts fetched successfully",
    data,
  });
});

const approveCommunity = catchAsync(async (req: Request, res: Response) => {
  const data = await CommunityService.approvePost(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Post approved successfully",
    data,
  });
});

const rejectCommunity = catchAsync(async (req: Request, res: Response) => {
  const data = await CommunityService.rejectPost(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Post rejected successfully",
    data,
  });
});

const deleteCommunity = catchAsync(async (req, res) => {
  const { id } = req.params;
  const {userId,role} = req.user;

  const result = await CommunityService.deleteCommunity(id, userId, role);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Community post deleted successfully",
    data: result,
  });
});

export const CommunityController = {
  createCommunity,
  getAllApproved,
  getMyPosts,
  getCommunityDetails,
  getCommentsById,
  adminGetAll,
  updateCommunity,
  approveCommunity,
  rejectCommunity,
  deleteCommunity,
  getPendingCommunities
};
