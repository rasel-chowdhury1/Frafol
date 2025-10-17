import AppError from '../../error/AppError';
import { IWorkshopParticipant } from './workshopParticipant.interface';
import { WorkshopParticipant } from './workshopParticipant.model';

import httpStatus from 'http-status';

const createWorkshopParticipant = async (payload: IWorkshopParticipant) => {
  const participant = await WorkshopParticipant.create(payload);
  return participant;
};

const getAllWorkshopParticipants = async () => {
  return await WorkshopParticipant.find({ isDeleted: false })
    .populate('clientId instructorId workshopId');
};

const getWorkshopParticipantById = async (id: string) => {
  const participant = await WorkshopParticipant.findById(id)
    .populate('clientId instructorId workshopId');
  if (!participant || participant.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Workshop participant not found');
  }
  return participant;
};

const updateWorkshopParticipant = async (
  id: string,
  payload: Partial<IWorkshopParticipant>
) => {
  const updated = await WorkshopParticipant.findOneAndUpdate(
    { _id: id, isDeleted: false },
    payload,
    { new: true }
  );
  if (!updated) throw new AppError(httpStatus.NOT_FOUND, 'Workshop participant not found');
  return updated;
};

const deleteWorkshopParticipant = async (id: string) => {
  const deleted = await WorkshopParticipant.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );
  if (!deleted) throw new AppError(httpStatus.NOT_FOUND, 'Workshop participant not found');
  return deleted;
};

export const WorkshopParticipantService = {
  createWorkshopParticipant,
  getAllWorkshopParticipants,
  getWorkshopParticipantById,
  updateWorkshopParticipant,
  deleteWorkshopParticipant,
};
