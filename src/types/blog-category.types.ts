import mongoose from "mongoose";

export type BlogCategoryType = {
  parentCategory: mongoose.Types.ObjectId | null;
  subCategories: mongoose.Types.ObjectId[];
  image: string;
  name: string;
  slug: string;
  status: "active" | "inactive";
  blogs: mongoose.Types.ObjectId[];
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
};
