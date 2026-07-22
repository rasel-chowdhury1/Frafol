import { CommissionSetup } from "./commissionSetup.model";
import { ICommissionSetup, IUpdateCommissionSetup } from "./commissionSetup.interface";

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
  let setup = await CommissionSetup.findOne();
  if (!setup) {
    setup = await CommissionSetup.create({
      photoVideoGrapy: 0,
      minimumCharge: 0,
      gearOrders: 0,
      workShop: 0,
    });
  }
  return setup;
};

const updateCommissionSetup = async (payload: IUpdateCommissionSetup) => {
  let setup = await CommissionSetup.findOne();

  if (!setup) {
    setup = await CommissionSetup.create(payload);
  } else {
    setup.photoVideoGrapy = payload.photoVideoGrapy ?? setup.photoVideoGrapy;
    setup.minimumCharge = payload.minimumCharge ?? setup.minimumCharge;
    setup.gearOrders = payload.gearOrders ?? setup.gearOrders;
    setup.workShop = payload.workShop ?? setup.workShop;
    await setup.save();
  }

  return setup;
};

export const CommissionSetupService = {
  createOrUpdateCommissionSetup,
  getCommissionSetup,
  updateCommissionSetup,
};
