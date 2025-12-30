import express, { Router } from "express";
import verifyToken from "../middlewares/authMiddleware";
import {
  getInvoices,
  updateInvoice,
  deleteInvoice,
  getInvoicesByUserId,
  getInvoiceStats,
  downloadInvoicePDF,
} from "../controllers/invoice.controller";

const router: Router = express.Router();

// Admin routes (require permissions)
router.get("/getInvoices", verifyToken, getInvoices); 
router.patch("/updateInvoice", verifyToken, updateInvoice); 
router.delete("/deleteInvoice", verifyToken, deleteInvoice); 
router.get("/stats", verifyToken, getInvoiceStats); 
router.get("/download", downloadInvoicePDF);

// User routes
router.get("/getUserInvoices", verifyToken, getInvoicesByUserId); 

export default router;