import moment from 'moment';
import AppError from '../../error/AppError';
import { Workshop } from '../workshop/workshop.model';
import { IWorkshopParticipant } from './workshopParticipant.interface';
import { WorkshopParticipant } from './workshopParticipant.model';

import httpStatus from 'http-status';

const createWorkshopParticipant = async (payload: IWorkshopParticipant) => {

  const isExistWorkshop = await Workshop.findOne({_id: payload.workshopId, approvalStatus: "approved", isDeleted: false  });

    // ========================================
    // 🔢 Generate Custom Workshop Order ID
    // ========================================
    const today = moment().format("YYYYMMDD");
    const prefix = "WORKSHOP";
    let orderCount = await WorkshopParticipant.countDocuments({
      createdAt: {
        $gte: moment().startOf("day").toDate(),
        $lte: moment().endOf("day").toDate(),
      },
    });


  const sequence = String(orderCount+1).padStart(4, "0");
  const customOrderId = `${prefix}-${today}-${sequence}`;

  payload.orderId = customOrderId;
  payload.instructorId = isExistWorkshop?.authorId as any;

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
