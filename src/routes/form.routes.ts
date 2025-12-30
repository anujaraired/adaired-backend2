import express, { Router } from "express";
import {
  createForm,
  readForm,
  updateForm,
  deleteForm,
} from "../controllers/form.controller";
import {
  createField,
  readFields,
  updateField,
  deleteField,
} from "../controllers/field.controller";
import verifyToken from "../middlewares/authMiddleware";

const router: Router = express.Router();

router.post("/create-form", verifyToken, createForm);
router.get("/read-form", readForm);
router.patch("/update-form", verifyToken, updateForm);
router.delete("/delete-form", verifyToken, deleteForm);

router.post("/create-field", verifyToken, createField);
router.get("/read-fields", readFields);
router.patch("/update-field", verifyToken, updateField);
router.delete("/delete-field", verifyToken, deleteField);

export default router;