import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { couponService } from "./coupon.service";

const createCoupon = catchAsync(async (req, res) => {

  console.log(req.body)
  const result = await couponService.createCoupon(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Coupon created successfully",
    data: result,
  });
});


const updateCouponStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // true / false

  const result = await couponService.toggleCouponStatus(id, status);

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Coupon status updated to ${status ? "active" : "inactive"}`,
    data: result,
  });
});

const getAllCoupons = catchAsync(async (req, res) => {

  const result = await couponService.getCoupons(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Coupons retrieved successfully",
    data: result,
  });

});


const updateCoupon = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await couponService.updateCoupon(id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Coupon updated successfully",
    data: result,
  });
});

const deleteCoupon = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await couponService.deleteCoupon(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Coupon deleted successfully",
    data: result,
  });
});

export const CouponController = {
  createCoupon,
  getAllCoupons,
  updateCoupon,
  deleteCoupon,
  updateCouponStatus
};
