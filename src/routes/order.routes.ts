import {
  createOrder,
  stripeWebhook,
  getOrders,
  updateOrder,
  deleteOrder,
  getOrdersByUserId,
  getOrderStats,
  getSalesReport
} from "../controllers/order.controller";
import express, { Router } from "express";
import verifyToken from "../middlewares/authMiddleware";

const router: Router = express.Router();

router.post("/create", verifyToken, createOrder);
router.post(
  "/stripe-webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);
router.get("/getOrders", verifyToken, getOrders);
router.patch("/updateOrder", verifyToken, updateOrder);
router.delete("/deleteOrder", verifyToken, deleteOrder);
router.get("/getUserOrders", verifyToken, getOrdersByUserId);
router.get("/stats", verifyToken, getOrderStats);
router.get("/sales-report", verifyToken, getSalesReport);

export default router;
