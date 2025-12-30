import express, { Router } from "express";
import {
  validatePermissionModuleCreate,
  validatePermissionModuleUpdate,
} from "../helpers/validator";
import {
  createModule,
  findModules,
  updateModule,
  deleteModule,
} from "../controllers/permission-module.controller";
import verifyToken from "../middlewares/authMiddleware";
const router: Router = express.Router();

router.post(
  "/create",
  verifyToken,
  validatePermissionModuleCreate,
  createModule
);
router.get("/find", findModules);
router.patch(
  "/update",
  verifyToken,
  validatePermissionModuleUpdate,
  updateModule
);
router.delete("/delete", verifyToken, deleteModule);  

export default router;
