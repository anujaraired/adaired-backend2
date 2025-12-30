import {
  newBlog,
  readBlog,
  updateBlog,
  deleteBlog,
} from "../controllers/blog.controller";
import express, { Router } from "express";
import { validateBlog, validateUpdateBlog } from "../helpers/validator";
import verifyToken from "../middlewares/authMiddleware";
const router: Router = express.Router();

router.post("/create", verifyToken, validateBlog, newBlog);
router.get("/read", readBlog);
router.patch("/update", verifyToken, validateUpdateBlog, updateBlog);
router.delete("/delete", verifyToken, deleteBlog);

export default router;
