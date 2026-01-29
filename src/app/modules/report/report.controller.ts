import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ReportService } from "./report.service";
import { storeFile } from "../../utils/fileHelper";

const createReport = catchAsync(async (req: Request, res: Response) => {
  req.body.userId = req.user.userId; 
  
    if (req?.file) {
    // console.log("req file =>>>> ",req.file)
    req.body.image = storeFile('report', req?.file?.filename);
  }

  const result = await ReportService.createReport(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Report created successfully",
    data: result,
  });
});

const getAllReports = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.getAllReports();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Reports retrieved successfully",
    data: result,
  });
});

const getReportById = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.getReportById(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Report retrieved successfully",
    data: result,
  });
});

const updateReport = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.updateReport(req.params.id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Report updated successfully",
    data: result,
  });
});

const deleteReport = catchAsync(async (req: Request, res: Response) => {
  await ReportService.deleteReport(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Report deleted successfully",
    data: null,
  });
});

export const ReportController = {
  createReport,
  getAllReports,
  getReportById,
  updateReport,
  deleteReport,
};
