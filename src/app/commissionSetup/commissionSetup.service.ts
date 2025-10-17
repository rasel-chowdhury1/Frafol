import { CommissionSetup } from "./commissionSetup.model";
import { ICommissionSetup, IUpdateCommissionSetup } from "./commissionSetup.interface";
import httpStatus from "http-status";
import AppError from "../error/AppError";

const createOrUpdateCommissionSetup = async (payload: ICommissionSetup) => {
  let setup = await CommissionSetup.findOne();
  if (setup) {
    setup.photoVideoGrapy = payload.photoVideoGrapy ?? setup.photoVideoGrapy;
    setup.minimumCharge = payload.minimumCharge ?? setup.minimumCharge;
    setup.gearOrders = payload.gearOrders ?? setup.gearOrders;
    setup.workShop = payload.workShop ?? setup.workShop;
    await setup.save();
  } else {
    setup = await CommissionSetup.create(payload);
  }
  return setup;
};

const getCommissionSetup = async () => {
  const setup = await CommissionSetup.findOne();
  if (!setup) throw new AppError(httpStatus.NOT_FOUND, "Commission setup not found");
  return setup;
};

const updateCommissionSetup = async (payload: IUpdateCommissionSetup) => {
  const setup = await CommissionSetup.findOne();
  if (!setup) throw new AppError(httpStatus.NOT_FOUND, "Commission setup not found");

  setup.photoVideoGrapy = payload.photoVideoGrapy ?? setup.photoVideoGrapy;
  setup.minimumCharge = payload.minimumCharge ?? setup.minimumCharge;
  setup.gearOrders = payload.gearOrders ?? setup.gearOrders;
  setup.workShop = payload.workShop ?? setup.workShop;

  await setup.save();
  return setup;
};

export const CommissionSetupService = {
  createOrUpdateCommissionSetup,
  getCommissionSetup,
  updateCommissionSetup,
};
