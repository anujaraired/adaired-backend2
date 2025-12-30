import mongoose, { Schema } from "mongoose";
import { ProductTypes } from "../types/productTypes";

const ProductSchema = new Schema<ProductTypes>(
  {
    featuredImage: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Product_Category",
      required: true,
    },
    subCategory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product_Category",
        default: null,
      },
    ],
    minimumQuantity: { type: Number, default: 1 },
    minimumWords: { type: Number, default: null },
    slug: { type: String, unique: true },
    pricePerUnit: { type: Number, required: true },
    pricingType: {
      type: String,
      enum: ["perWord", "perPost", "perReview", "perMonth", "perQuantity"],
      default: "perWord",
    },
    stock: { type: Number, default: 0 },
    images: { type: [String] },
    tags: { type: [String] },
    priority: { type: Number, default: 0 },
    keywords: { type: [String] },
    formId: { type: Schema.Types.ObjectId, ref: "Form" },
    metaTitle: { type: String },
    metaDescription: { type: String },
    canonicalLink: { type: String },
    status: {
      type: String,
      enum: ["active", "inactive", "archived", "out of stock"],
      default: "active",
    },
    isFreeProduct: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

ProductSchema.index({ category: 1 });

const Product = mongoose.model<ProductTypes>("Product", ProductSchema);

export default Product;
