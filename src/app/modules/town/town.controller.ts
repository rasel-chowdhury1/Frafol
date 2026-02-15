import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { townService} from "./town.service";

const createTown = catchAsync(async (req: Request, res: Response) => {
  const result = await townService.createTown(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Town created successfully",
    data: result,
  });
});

const getAllTowns = catchAsync(async (_req: Request, res: Response) => {
  const result = await townService.getAllTowns();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Towns retrieved successfully",
    data: result,
  });
});

const getTownById = catchAsync(async (req: Request, res: Response) => {
  const result = await townService.getTownById(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Town retrieved successfully",
    data: result,
  });
});

const updateTown = catchAsync(async (req: Request, res: Response) => {
  const result = await townService.updateTown(req.params.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Town updated successfully",
    data: result,
  });
});

const deleteTown = catchAsync(async (req: Request, res: Response) => {
  const result = await townService.deleteTown(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Town deleted successfully",
    data: result,
  });
});


export const townController = {
  createTown,
  getAllTowns,
  getTownById,
  updateTown,
  deleteTown
}