import AppError from '../../error/AppError';
import { IGearOrder } from './gearOrder.interface';
import { GearOrder } from './gearOrder.model';

import httpStatus from 'http-status';

const createGearOrder = async (payload: IGearOrder) => {
  const order = await GearOrder.create(payload);
  return order;
};

const getAllGearOrders = async () => {
  return await GearOrder.find({ isDeleted: false })
    .populate('clientId sellerId gearMarketplaceId');
};

const getGearOrderById = async (id: string) => {
  const order = await GearOrder.findById(id).populate('clientId sellerId gearMarketplaceId');
  if (!order || order.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Gear order not found');
  }
  return order;
};

const updateGearOrder = async (id: string, payload: Partial<IGearOrder>) => {
  const updated = await GearOrder.findOneAndUpdate(
    { _id: id, isDeleted: false },
    payload,
    { new: true }
  );
  if (!updated) throw new AppError(httpStatus.NOT_FOUND, 'Gear order not found');
  return updated;
};

const deleteGearOrder = async (id: string) => {
  const deleted = await GearOrder.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );
  if (!deleted) throw new AppError(httpStatus.NOT_FOUND, 'Gear order not found');
  return deleted;
};

export const GearOrderService = {
  createGearOrder,
  getAllGearOrders,
  getGearOrderById,
  updateGearOrder,
  deleteGearOrder,
};
