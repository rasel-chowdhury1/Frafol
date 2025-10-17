import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { PackageService } from "./package.service";
import { storeFile } from "../../utils/fileHelper";
import { ApprovalStatus } from "./package.interface";
import httpStatus from "http-status";

const createPackage = catchAsync(async (req: Request, res: Response) => {
  req.body.authorId = req.user.userId;

  if (req?.file) {
    req.body.thumbnailImage = storeFile("package", req?.file?.filename);
  }

  console.log("Request Body:", req.body); // Debugging line

  const result = await PackageService.createPackage(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Package created successfully",
    data: result,
  });
});

const getAllPackages = catchAsync(async (req: Request, res: Response) => {
  const result = await PackageService.getAllPackages(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Packages retrieved successfully",
    data: result,
  });
});

const getPackageById = catchAsync(async (req: Request, res: Response) => {
  const result = await PackageService.getPackageById(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Package retrieved successfully",
    data: result,
  });
});

const getMyPackages = catchAsync(async (req: Request, res: Response) => {
  const result = await PackageService.getMyPackages(req.user.userId, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "My packages retrieved successfully",
    data: result,
  });
});

const getPendingPackages = catchAsync(async (req: Request, res: Response) => {
  const result = await PackageService.getPendingPackages(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Pending packages retrieved successfully",
    data: result,
  });
});

const getUserPackageAndReviewStats = catchAsync(async (req: Request, res: Response) => {
  const authorId = req.params.userId;

  const result = await PackageService.getUserPackageAndReviewStats(authorId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User package and review stats retrieved successfully",
    data: result,
  });
});

const updatePackage = catchAsync(async (req: Request, res: Response) => {
  if (req?.file) {
    req.body.thumbnailImage = storeFile("package", req?.file?.filename);
  }

  const result = await PackageService.updatePackage(
    req.params.id,
    req.user.userId,
    req.body
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Package updated successfully",
    data: result,
  });
});

const updateApprovalStatusByAdmin = catchAsync(async (req: Request, res: Response) => {
  const { approvalStatus } = req.body as { approvalStatus: ApprovalStatus };

  if (!approvalStatus) {
    sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: "approvalStatus is required",
      data: null,
    });
  }

  const result = await PackageService.updateApprovalStatusByAdmin(
    req.params.id,
    approvalStatus
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Package approval status updated successfully",
    data: result,
  });
});

const declinePackageById = catchAsync(async (req: Request, res: Response) => {

  const {reason} = req.body as { reason: string };

    if (!reason) {
      sendResponse(res, {
        statusCode: httpStatus.BAD_REQUEST,
        success: false,
        message: "reason is required",
        data: null,
      });
    } 
  const result = await PackageService.declinePackageById(
    req.params.id,
    reason
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Package declined successfully",
    data: result,
  });
});

const deletePackage = catchAsync(async (req: Request, res: Response) => {
  
  const {userId, role} = req.user;
  await PackageService.deletePackage(req.params.id, req.user.userId, role);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Package deleted successfully",
    data: null,
  });
});

export const PackageController = {
  createPackage,
  getAllPackages,
  getPackageById,
  getMyPackages,
  getPendingPackages,
  getUserPackageAndReviewStats,
  updatePackage,
  updateApprovalStatusByAdmin,
  declinePackageById,
  deletePackage,
};
