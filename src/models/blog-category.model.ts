import mongoose, { Schema } from "mongoose";
import { BlogCategoryType } from "../types/blog-category.types";

const blogCategorySchema = new Schema<BlogCategoryType>(
  {
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: "Blog_Category",
      default: null,
    },
    subCategories: {
      type: [Schema.Types.ObjectId],
      ref: "Blog_Category",
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
    blogs: {
      type: [Schema.Types.ObjectId],
      ref: "Blog",
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

const Blog_Category = mongoose.model<BlogCategoryType>(
  "Blog_Category",
  blogCategorySchema
);
export default Blog_Category;
