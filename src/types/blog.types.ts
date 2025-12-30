import mongoose from "mongoose";
import { SEO } from "./seo-schema.types";

export interface BlogTypes extends Document {
  category?: mongoose.Types.ObjectId | null;
  featuredImage: string;
  postTitle: string;
  postDescription: string;
  slug: string;
  tags: string[];
  seo: SEO;
  blogAuthor?: mongoose.Types.ObjectId | null;
  updatedBy?: mongoose.Types.ObjectId | null;
  status: "publish" | "draft" | "scheduled";
  scheduledPublishDate?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}