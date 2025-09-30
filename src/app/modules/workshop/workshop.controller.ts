import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { WorkshopService } from "./workshop.service";
import { storeFile } from "../../utils/fileHelper";
import { ApprovalStatus } from "../gearMarketplace/gearMarketplace.interface";

const createWorkshop = catchAsync(async (req: Request, res: Response) => {
  req.body.authorId = req.user.userId; // logged-in user

    if (req?.file) {
      req.body.image = storeFile('workshop', req?.file?.filename);
    }
  const result = await WorkshopService.createWorkshop(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Workshop created successfully",
    data: result,
  });
});

const getAllWorkshops = catchAsync(async (req: Request, res: Response) => {
  const result = await WorkshopService.getAllWorkshops(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Workshops retrieved successfully",
    data: result,
  });
});

const getWorkshopById = catchAsync(async (req: Request, res: Response) => {
  const result = await WorkshopService.getWorkshopById(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Workshop retrieved successfully",
    data: result,
  });
});

const getMyWorkshops = catchAsync(async (req: Request, res: Response) => {
  const result = await WorkshopService.getMyWorkshops(req.user.userId, req.query);  
  sendResponse(res, {
    statusCode: 200,
    success: true,  
    message: "My workshops retrieved successfully",
    data: result,
  });
});

const getPendingWorkshops = catchAsync(async (req: Request, res: Response) => {
  const result = await WorkshopService.getPendingWorkshops(req.query);  
  sendResponse(res, {
    statusCode: 200,
    success: true,  
    message: "Pending workshops retrieved successfully",
    data: result,
  });
});


const updateWorkshop = catchAsync(async (req: Request, res: Response) => {


    if (req?.file) {
      req.body.image = storeFile('workshop', req?.file?.filename);
    }

  const result = await WorkshopService.updateWorkshop(
    req.params.id,
    req.user.userId,
    req.body
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Workshop updated successfully",
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
  const result = await WorkshopService.updateApprovalStatusByAdmin(
    req.params.id,
    approvalStatus
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Workshop approval status updated successfully",
    data: result,
  });
});

const declineWorkshopById = catchAsync(async (req: Request, res: Response) => {
    const {reason} = req.body as { reason: string };
    if (!reason) {  
      sendResponse(res, { 
        statusCode: httpStatus.BAD_REQUEST,
        success: false,   
        message: "reason is required",
        data: null,
      });
    }
  const result = await WorkshopService.declineWorkshopById(
    req.params.id,
    reason
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Workshop declined successfully",
    data: result,
  });
});

const deleteWorkshop = catchAsync(async (req: Request, res: Response) => {
  const {role} = req.user;
  const result = await WorkshopService.deleteWorkshop(
    req.params.id,
    req.user.userId,
    role
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Workshop deleted successfully",
    data: null,
  });
});

export const WorkshopController = {
  createWorkshop,
  getAllWorkshops,
  getWorkshopById,
  getMyWorkshops,
  getPendingWorkshops,
  updateWorkshop,
  updateApprovalStatusByAdmin,
  declineWorkshopById,
  deleteWorkshop,
};
