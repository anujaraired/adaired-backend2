import {
  createCaseStudy,
  getCaseStudy,
  updateCaseStudy,
  deleteCaseStudy,
} from "../controllers/case-study.controller";
import express, { Router } from "express";
import verifyToken from "../middlewares/authMiddleware";
import {
  validateCaseStudy,
  validateDeleteCaseStudy,
  validateUpdateCaseStudy,
} from "../helpers/validator";

const router: Router = express.Router();

router.post("/create", verifyToken, validateCaseStudy, createCaseStudy);
router.get("/read", getCaseStudy);
router.put("/update", verifyToken, validateUpdateCaseStudy, updateCaseStudy);
router.delete("/delete", verifyToken, validateDeleteCaseStudy, deleteCaseStudy);

export default router;
