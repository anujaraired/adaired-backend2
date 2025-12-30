import express, { Router } from "express";
import { validateLogin, validateRegister } from "../helpers/validator";
import {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyUser,
} from "../controllers/auth.controller";
import verifyToken from "../middlewares/authMiddleware";
const router: Router = express.Router();

router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.post("/refresh-token", refreshToken);
router.post("/logout", verifyToken, logout);
router.post("/forgot-password", forgotPassword);
router.patch("/reset-password", resetPassword);
router.post("/send-verification-email", sendVerificationEmail);
router.get("/verify-user", verifyUser);

export default router;
