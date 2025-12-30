import express, { Router } from "express";
import {
  createCategory,
  deleteCategory,
  readCategories,
  updateCategory,
} from "../controllers/product-category.controller";
import verifyToken from "../middlewares/authMiddleware";
import {
  validateProductCreateCategory,
  validateProductUpdateCategory,
} from "../helpers/validator";

const router: Router = express.Router();

router.post(
  "/create-category",
  verifyToken,
  validateProductCreateCategory,
  createCategory
);
router.get("/read-category", readCategories);
router.patch(
  "/update-category",
  verifyToken,
  validateProductUpdateCategory,
  updateCategory
);
router.delete("/delete-category", verifyToken, deleteCategory);

export default router;
