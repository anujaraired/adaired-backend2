import mongoose from "mongoose";

export type CaseStudyCategoryType = {
  parentCategory: mongoose.Types.ObjectId | null;
  subCategories: mongoose.Types.ObjectId[];
  image: string;
  name: string;
  slug: string;
  status: "active" | "inactive";
  caseStudies: mongoose.Types.ObjectId[];
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
};
