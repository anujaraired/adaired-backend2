import mongoose, { Schema } from "mongoose";
import { CaseStudyCategoryType } from "../types/case-study-category.types";

const caseStudyCategorySchema = new Schema<CaseStudyCategoryType>(
  {
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: "Case_Study_Category",
      default: null,
    },
    subCategories: {
      type: [Schema.Types.ObjectId],
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
    caseStudies: {
      type: [Schema.Types.ObjectId],
      ref: "CaseStudy",
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

const CaseStudy_Category = mongoose.model<CaseStudyCategoryType>(
  "Case_Study_Category",
  caseStudyCategorySchema
);

export default CaseStudy_Category;
