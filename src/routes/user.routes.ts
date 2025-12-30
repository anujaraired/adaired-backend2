import express, { Router } from "express";
const router: Router = express.Router();
import {
  findUser,
  updateUser,
  killUser,
  getCurrentUser,
} from "../controllers/user.controller";
import verifyToken from "../middlewares/authMiddleware";

router.get("/find", verifyToken, findUser);
router.patch("/update", verifyToken, updateUser);
router.delete("/delete", verifyToken, killUser);
router.get("/me", verifyToken, getCurrentUser);
export default router;
