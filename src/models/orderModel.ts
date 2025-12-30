import mongoose, { Schema } from "mongoose";
import { OrderTypes } from "../types/orderTypes";

// Create the Order schema
const OrderSchema = new Schema<OrderTypes>(
  {
    orderNumber: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    products: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        wordCount: { type: Number, min: 100 },
        quantity: { type: Number, required: true, min: 1 },
        additionalInfo: { type: String },
        totalPrice: { type: Number, required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    totalQuantity: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    couponDiscount: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true },
    couponId: { type: Schema.Types.ObjectId, ref: "Coupon", default: null },
    paymentId: { type: String, default: null },
    invoiceId: { type: String },
    zohoInvoiceId: { type: String },
    paymentUrl: { type: String, default: null },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Confirmed", "Completed", "Cancelled"],
      default: "Pending",
    },
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Paid", "Refunded", "Failed"],
      default: "Unpaid",
    },
    paymentMethod: {
      type: String,
      enum: ["Razorpay", "Stripe"],
      required: true,
    },
    paymentDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

OrderSchema.index({ orderNumber: 1 }, { unique: true });
OrderSchema.index({ userId: 1 });
OrderSchema.index({ paymentId: 1 });
OrderSchema.index({ invoiceId: 1 });
OrderSchema.index({ zohoInvoiceId: 1 });

const Order = mongoose.model<OrderTypes>("Order", OrderSchema);

export default Order;
