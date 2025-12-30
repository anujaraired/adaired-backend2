import express, { Router } from "express";
import { validateRole, validateUpdateRole } from "../helpers/validator";
import {
  createRole,
  updateRole,
  findRoles,
  deleteRole,
  duplicateRole,
} from "../controllers/role.controller";
import verifyToken from "../middlewares/authMiddleware";
const router: Router = express.Router();

router.post("/create", verifyToken, validateRole, createRole);
router.get("/find", verifyToken, findRoles);
router.patch("/update", verifyToken, validateUpdateRole, updateRole);
router.delete("/delete", verifyToken, deleteRole);
router.post("/duplicate", verifyToken, duplicateRole);

export default router;
