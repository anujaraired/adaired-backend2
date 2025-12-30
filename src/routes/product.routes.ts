import express, { Router } from "express";
import {
  createProduct,
  readProducts,
  updateProduct,
  deleteProduct,
  duplicateProduct,
} from "../controllers/product.controller";
import verifyToken from "../middlewares/authMiddleware";
import {
  validateCreateProduct, 
  validateUpdateProduct,
} from "../helpers/validator";

const router: Router = express.Router();

router.post(
  "/create-product",
  verifyToken,
  validateCreateProduct,
  createProduct
);
router.patch(
  "/update-product",
  verifyToken,
  validateUpdateProduct,
  updateProduct
);
router.get("/read-product", readProducts);
router.delete("/delete-product", verifyToken, deleteProduct);
router.post("/duplicate-product", verifyToken, duplicateProduct);

export default router;
