import express, { Router } from "express";
import {
  createService,
  deleteService,
  readServices,
  updateService,
  duplicateService
} from "../controllers/service.controller";
import verifyToken from "../middlewares/authMiddleware";
import {
  ValidateCreateService,
  ValidateUpdateService,
} from "../helpers/validator";

const router: Router = express.Router();

router.post(
  "/createService",
  verifyToken,
  ValidateCreateService,
  createService
);
router.get("/getServices/:identifier", readServices);
router.put(
  "/updateService/:id",
  verifyToken,
  ValidateUpdateService,
  updateService
);
router.delete("/deleteService/:id", verifyToken, deleteService);
router.post("/duplicateService/:id", verifyToken, duplicateService);

export default router;
