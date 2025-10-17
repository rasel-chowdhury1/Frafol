import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { WorkshopParticipantService } from './workshopParticipant.service';

const createWorkshopParticipant = catchAsync(async (req: Request, res: Response) => {
  const result = await WorkshopParticipantService.createWorkshopParticipant(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Workshop participant added successfully',
    data: result,
  });
});

const getAllWorkshopParticipants = catchAsync(async (req: Request, res: Response) => {
  const result = await WorkshopParticipantService.getAllWorkshopParticipants();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Workshop participants retrieved successfully',
    data: result,
  });
});

const getWorkshopParticipantById = catchAsync(async (req: Request, res: Response) => {
  const result = await WorkshopParticipantService.getWorkshopParticipantById(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Workshop participant retrieved successfully',
    data: result,
  });
});

const updateWorkshopParticipant = catchAsync(async (req: Request, res: Response) => {
  const result = await WorkshopParticipantService.updateWorkshopParticipant(
    req.params.id,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Workshop participant updated successfully',
    data: result,
  });
});

const deleteWorkshopParticipant = catchAsync(async (req: Request, res: Response) => {
  const result = await WorkshopParticipantService.deleteWorkshopParticipant(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Workshop participant deleted successfully',
    data: result,
  });
});

export const WorkshopParticipantController = {
  createWorkshopParticipant,
  getAllWorkshopParticipants,
  getWorkshopParticipantById,
  updateWorkshopParticipant,
  deleteWorkshopParticipant,
};
