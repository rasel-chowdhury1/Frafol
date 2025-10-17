import { Request, Response } from "express";
import { CommissionSetupService } from "./commissionSetup.service";
import httpStatus from "http-status";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";

const createOrUpdateCommission = catchAsync(async (req: Request, res: Response) => {
  const result = await CommissionSetupService.createOrUpdateCommissionSetup(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Commission setup saved successfully",
    data: result,
  });
});

const getCommission = catchAsync(async (req: Request, res: Response) => {
  const result = await CommissionSetupService.getCommissionSetup();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Commission setup retrieved successfully",
    data: result,
  });
});

const updateCommission = catchAsync(async (req: Request, res: Response) => {
  const result = await CommissionSetupService.updateCommissionSetup(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Commission setup updated successfully",
    data: result,
  });
});

export const CommissionSetupController = {
  createOrUpdateCommission,
  getCommission,
  updateCommission,
};
