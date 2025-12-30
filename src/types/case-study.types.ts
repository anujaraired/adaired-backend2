import { Document, Types } from "mongoose";
import { SEO } from "./seo-schema.types";

export interface CaseStudy extends Document {
  category?: Types.ObjectId | null;
  name: string;
  slug?: string | null;
  colorScheme: string;
  status: "active" | "inactive";
  bodyData?: unknown[];
  seo: SEO;
  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
}
