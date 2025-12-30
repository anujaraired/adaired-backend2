import { Document, Types } from "mongoose";

export interface InvoiceTypes extends Document {
  invoiceNumber: string;
  orderId: Types.ObjectId;
  userId: Types.ObjectId;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: "Unpaid" | "Paid" | "Overdue" | "Cancelled";
  dueDate: Date;
  issuedDate: Date;
  paymentMethod: "Razorpay" | "Stripe" | "Manual";
  paymentId: string | null;
  zohoInvoiceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}