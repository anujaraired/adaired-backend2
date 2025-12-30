import mongoose, { Schema } from "mongoose";
import { BlogTypes } from "../types/blog.types";
import seoSchema from "./seo-schema.model";

const blogSchema = new Schema<BlogTypes>(
  {
    category: {
      type: Schema.Types.ObjectId,
      ref: "Blog_Category",
      default: null,
      index: true,
    },
    featuredImage: {
      type: String,
      required: true,
      trim: true,
    },
    postTitle: {
      type: String,
      required: true,
      trim: true,
    },
    postDescription: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    seo: {
      type: seoSchema,
      required: [true, "SEO data is required"],
    },
    blogAuthor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["publish", "draft", "scheduled"],
      default: "draft",
      index: true,
    },
    scheduledPublishDate: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

const Blog = mongoose.model<BlogTypes>("Blog", blogSchema);

export default Blog;