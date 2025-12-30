import {
  newCaseStudyCategory,
  getCaseStudyCategories,
  updateCaseStudyCategory,
  deleteCaseStudyCategory,
} from "../controllers/case-study-category.controller";
import express, { Router } from "express";
import { validateCaseStudyCategory, validateUpdateCaseStudyCategory } from "../helpers/validator";
import verifyToken from "../middlewares/authMiddleware";

const router: Router = express.Router();

router.post(
  "/create",
  verifyToken,
  validateCaseStudyCategory,
  newCaseStudyCategory
);
router.get("/read", getCaseStudyCategories);
router.patch("/update", verifyToken, validateUpdateCaseStudyCategory, updateCaseStudyCategory);
router.delete("/delete", verifyToken, deleteCaseStudyCategory);

export default router;