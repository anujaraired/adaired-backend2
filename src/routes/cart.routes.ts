import express, { Router } from "express";
import verifyToken from "../middlewares/authMiddleware";
import {
  syncOrAddToCart,
  updateCart,
  getUserCart,
  emptyCart,
  deleteProduct,
} from "../controllers/cart.controller";

const router: Router = express.Router();

router.post("/add-product-or-sync-cart", verifyToken, syncOrAddToCart);
router.get("/get-user-cart", verifyToken, getUserCart);
router.patch("/update-cart", verifyToken, updateCart);
router.delete("/delete-product", verifyToken, deleteProduct);
router.delete("/empty-cart", verifyToken, emptyCart);

export default router;
