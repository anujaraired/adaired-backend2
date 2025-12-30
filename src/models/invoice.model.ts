import mongoose, { Schema } from "mongoose";
import { InvoiceTypes } from "../types/invoice.types";

// Create the Invoice schema
const InvoiceSchema = new Schema<InvoiceTypes>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    totalAmount: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Unpaid", "Paid", "Overdue", "Cancelled"],
      default: "Unpaid",
    },
    dueDate: { type: Date, required: true },
    issuedDate: { type: Date, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ["Razorpay", "Stripe", "Manual"],
      required: true,
    },
    paymentId: { type: String, default: null },
    zohoInvoiceId: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

InvoiceSchema.index({ orderId: 1 });
InvoiceSchema.index({ userId: 1 });
InvoiceSchema.index({ paymentId: 1 });
InvoiceSchema.index({ zohoInvoiceId: 1 });

const Invoice = mongoose.model<InvoiceTypes>("Invoice", InvoiceSchema);

export default Invoice;