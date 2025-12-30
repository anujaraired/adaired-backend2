import {
  newBlogCategory,
  getBlogCategories,
  updateBlogCategory,
  deleteBlogCategory,
} from "../controllers/blog-category.controller";
import express, { Router } from "express";
import { validateBlogCategoryCreate } from "../helpers/validator";
import verifyToken from "../middlewares/authMiddleware";
const router: Router = express.Router();

router.post(
  "/create",
  verifyToken,
  validateBlogCategoryCreate,
  newBlogCategory
);
router.get("/read", getBlogCategories);
router.patch("/update", verifyToken, updateBlogCategory);
router.delete("/delete", verifyToken, deleteBlogCategory);

export default router;
