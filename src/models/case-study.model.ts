import mongoose, { Schema, Model } from "mongoose";
import seoSchema from "./seo-schema.model";
import { CaseStudy } from "../types/case-study.types";

const caseStudySchema = new Schema<CaseStudy>(
  {
    category: {
      type: Schema.Types.ObjectId,
      ref: "Case_Study_Category",
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Case study name is required"],
      trim: true,
    },
    slug: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      trim: true,
    },
    colorScheme: {
      type: String,
      required: [true, "Color scheme is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive",
      required: [true, "Status is required"],
    },
    bodyData: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    seo: {
      type: seoSchema,
      required: [true, "SEO data is required"],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const CaseStudyModel: Model<CaseStudy> = mongoose.model(
  "Case_Study",
  caseStudySchema
);

export default CaseStudyModel;
