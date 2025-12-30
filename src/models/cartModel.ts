import mongoose, { Schema } from "mongoose";
import { CartTypes } from "../types/cartTypes";

const CartSchema = new Schema<CartTypes>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    products: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        wordCount: { type: Number, min: 100 },
        quantity: { type: Number, required: true, min: 1 },
        additionalInfo: { type: String },
        totalPrice: { type: Number, required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    totalQuantity: { type: Number, required: true, default: 0 },
    totalPrice: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

CartSchema.index({ userId: 1 });

const Cart = mongoose.model<CartTypes>("Cart", CartSchema);

export default Cart;
