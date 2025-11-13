import express from "express";
import { CouponController } from "./coupon.controller";

const router = express.Router();

// ✅ Create a new coupon
router
   .post("/", CouponController.createCoupon)

// ✅ Get all coupons (with query for filtering/pagination)
   .get("/", CouponController.getAllCoupons)

// ✅ Update a coupon by ID
   .patch("/:id", CouponController.updateCoupon)

// ✅ Delete a coupon by ID
   .delete("/:id", CouponController.deleteCoupon);

export const CouponRoutes = router;
