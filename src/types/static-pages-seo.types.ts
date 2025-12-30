import mongoose from "mongoose";
import { SEO } from "./seo-schema.types";

export interface PageSEOTypes {
  pageName: string;
  seo: SEO;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
}
