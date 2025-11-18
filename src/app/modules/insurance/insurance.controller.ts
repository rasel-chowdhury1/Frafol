import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { InsuranceService } from "./insurance.service";

// USER — apply
const applyInsurance = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const result = await InsuranceService.applyForInsurance(userId, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Insurance application submitted successfully",
    data: result,
  });
});

// ADMIN — get all applications
const getAllInsurance = catchAsync(async (req: Request, res: Response) => {
  const result = await InsuranceService.getAllInsuranceApplications(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "All insurance applications retrieved successfully",
    meta: result.meta,
    data: result.applications,
  });
});

// USER — get his own applications
const getMyInsurance = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;

  const result = await InsuranceService.getMyInsuranceApplications(
    userId,
    req.query
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "My insurance applications retrieved successfully",
    meta: result.meta,
    data: result.applications,
  });
});

export const InsuranceController = {
     applyInsurance,
     getAllInsurance,
     getMyInsurance
}
