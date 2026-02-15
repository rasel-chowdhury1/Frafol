import httpStatus from "http-status";
import { Town } from "./town.model";
import { ITown } from "./town.interface";
import AppError from "../../error/AppError";

const createTown = async (payload: ITown) => {
  const isExist = await Town.findOne({ name: payload.name });

  if (isExist) {
    throw new AppError(httpStatus.BAD_REQUEST, "Town already exists");
  }

  return await Town.create(payload);
};

const getAllTowns = async () => {
  return await Town.find().sort({ name: 1 });
};

const getTownById = async (id: string) => {
  const town = await Town.findById(id);

  if (!town) {
    throw new AppError(httpStatus.NOT_FOUND, "Town not found");
  }

  return town;
};

const updateTown = async (id: string, payload: Partial<ITown>) => {
  const town = await Town.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  if (!town) {
    throw new AppError(httpStatus.NOT_FOUND, "Town not found");
  }

  return town;
};

const deleteTown = async (id: string) => {
  const town = await Town.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );

  if (!town) {
    throw new AppError(httpStatus.NOT_FOUND, "Town not found");
  }

  return null;
};

export const townService = {
  createTown,
  getAllTowns,
  getTownById,
  updateTown,
  deleteTown,
};
