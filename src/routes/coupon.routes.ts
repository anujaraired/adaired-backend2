import express, { Router } from "express";
import verifyToken from "../middlewares/authMiddleware";
import {
  createCoupon,
  deleteCoupon,
  getCoupons,
  getCouponStats,
  updateCoupon,
} from "../controllers/coupon.controller";
import { calculateCouponDiscount } from "../controllers/coupon.controller";

const router: Router = express.Router();

router.post("/apply", calculateCouponDiscount);
router.post("/create", verifyToken, createCoupon);
router.patch("/update", verifyToken, updateCoupon);
router.get("/read", verifyToken, getCoupons);
router.get("/usageStats", verifyToken, getCouponStats);
router.delete("/delete", verifyToken, deleteCoupon);


export default router;
