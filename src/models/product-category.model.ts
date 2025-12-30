import mongoose, { Schema } from "mongoose";
import { CategoryTypes } from "../types/productTypes";

const productCategorySchema = new Schema<CategoryTypes>(
  {
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: "Product_Category",
      default: null,
    },
    subCategories: {
      type: [Schema.Types.ObjectId],
      ref: "Product_Category",
      default: [],
    },
    image: {
      type: String,
      default: "",
    },
    name: {
      type: String,
      required: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    products: {
      type: [Schema.Types.ObjectId],
      ref: "Product",
      default: [],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

const Product_Category = mongoose.model<CategoryTypes>(
  "Product_Category",
  productCategorySchema
);

export default Product_Category;
