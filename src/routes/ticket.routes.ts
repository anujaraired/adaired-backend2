import { Router } from "express";
import {
  createTicket,
  deleteTicket,
  getTickets,
  getTicketStats,
  updateTicket,
} from "../controllers/ticket.controller";
import { validateCreateTicket } from "../helpers/validator";
import multer from "multer";
import verifyToken from "../middlewares/authMiddleware";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/create",
  verifyToken,
  upload.array("attachments"),
  validateCreateTicket,
  createTicket
);

router.get("/read", verifyToken, getTickets);

router.get("/stats", verifyToken, getTicketStats);

router.patch("/update", upload.array("attachments"), verifyToken, updateTicket);

router.delete("/delete", verifyToken, deleteTicket);

export default router;
