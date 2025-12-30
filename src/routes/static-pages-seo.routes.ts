import express, { Router } from "express";
import verifyToken from "../middlewares/authMiddleware";
import {
  createPageSEO,
  updatePageSEO,
  getPageSEOByName,
  getAllPageSEO,
  deletePageSEO,
} from "../controllers/static-pages-seo.controller";

const router: Router = express.Router();

router.post("/create", verifyToken, createPageSEO);
router.patch("/update", verifyToken, updatePageSEO);
router.get("/read/:pageName", getPageSEOByName); // Public endpoint for frontend
router.get("/read", verifyToken, getAllPageSEO);
router.delete("/delete", verifyToken, deletePageSEO);

export default router;