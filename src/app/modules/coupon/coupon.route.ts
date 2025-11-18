import express from "express";
import { CouponController } from "./coupon.controller";

const router = express.Router();

// ✅ Create a new coupon
router
   .post("/", CouponController.createCoupon)

// ✅ Get all coupons (with query for filtering/pagination)
   .get("/", CouponController.getAllCoupons)

   .patch(
      "/status/:id",
      // auth("admin"), // if you have role-based auth
      CouponController.updateCouponStatus
   )

// ✅ Update a coupon by ID
   .patch(
      "/update/:id", 
      CouponController.updateCoupon
   )

// ✅ Delete a coupon by ID
   .delete("/:id", CouponController.deleteCoupon);

export const CouponRoutes = router;
