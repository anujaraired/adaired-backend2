import mongoose, { Schema } from "mongoose";
import { PageSEOTypes } from "../types/static-pages-seo.types";
import seoSchema from "./seo-schema.model";

const PageSEOSchema = new Schema<PageSEOTypes>(
  {
    pageName: {
      type: String,
      required: true,
      trim: true,
    },

    seo: {
      type: seoSchema,
      required: true,
      default: {},
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

PageSEOSchema.index({ pageName: 1 }, { unique: true });

export default mongoose.model<PageSEOTypes>("Static_Pages_Seo", PageSEOSchema);
