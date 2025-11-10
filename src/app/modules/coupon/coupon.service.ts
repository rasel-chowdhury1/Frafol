import { Coupon } from "./coupon.model";
import QueryBuilder from "../../builder/QueryBuilder";

const createCoupon = async (payload: any) => {
  return await Coupon.create(payload);
};

const getCoupons = async (query: Record<string, unknown>) => {
  const couponQuery = new QueryBuilder(Coupon.find(), query)
    .search(["code"]) // search by coupon code
    .filter()         // filter by any field if needed
    .sort()           // sort by createdAt or etc.
    .paginate()       // paginate result
    .fields();        // select fields

  const coupons = await couponQuery.modelQuery;
  const meta = await couponQuery.countTotal();

  return {
    meta,
    coupons,
  };
};

const updateCoupon = async (id: string, payload: any) => {
  return await Coupon.findByIdAndUpdate(id, payload, { new: true });
};  



const deleteCoupon = async (id: string) => {
  return await Coupon.findByIdAndDelete(id);
};

export const couponService = {
  createCoupon,
  getCoupons,
  updateCoupon,
  deleteCoupon,
};
