// import mongoose, { Schema } from "mongoose";
// import { CartTypes } from "../types/cartTypes";

// const JunkCartSchema = new Schema<CartTypes>(
//   {
//     userId: { type: String, default: null },
//     products: [
//       {
//         productId: {
//           type: Schema.Types.ObjectId,
//           ref: "Product",
//           required: true,
//         },
//         category: { type: String, required: true },
//         productName: { type: String, required: true },
//         productSlug: { type: String, required: true },
//         productImage: { type: String, required: true },
//         wordCount: { type: Number, min: 100 },
//         quantity: { type: Number, required: true, min: 1 },
//         additionalInfo: { type: String },
//         name: { type: String },
//         email: { type: String, required: true },
//         phone: { type: String, required: true },
//         pricePerUnit: { type: Number, required: true },
//         totalPrice: { type: Number, required: true },
//         isFreeProduct:{ type: Boolean, default: false},
//         orderType: {
//           type: String,
//           enum: ["OneTime", "Monthly"],
//           default: "OneTime",
//         },
//         addedAt: { type: Date, default: Date.now },
//       },
//     ],
//     totalQuantity: { type: Number, required: true, default: 0 },
//     totalPrice: { type: Number, required: true, default: 0 },
//     status: {
//       type: String,
//       enum: ["Unpaid", "Pending", "Completed", "Canceled"],
//       default: "Unpaid",
//     },
//   },
//   { timestamps: true }
// );

// JunkCartSchema.index({ userId: 1 });

// const Cart = mongoose.model<CartTypes>("JunkCartLeads", JunkCartSchema);

// export default Cart;
