import mongoose, { Types } from "mongoose";

export type ProductTypes = {
  _id: Types.ObjectId;
  featuredImage: string;
  name: string;
  description: string;
  category: Types.ObjectId;
  subCategory: Types.ObjectId;
  minimumWords?: number;
  minimumQuantity?: number;
  slug: string;
  pricePerUnit: number;
  pricingType: "perWord" | "perPost" | "perReview" | "perMonth" | "perQuantity";
  stock: number;
  images: string[];
  tags?: string[];
  priority?: number;
  keywords?: string[];
  formId?: Types.ObjectId;
  metaTitle?: string;
  metaDescription?: string;
  canonicalLink?: string;
  status: "active" | "inactive" | "archived" | "out of stock";
  isFreeProduct: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

export interface CategoryTypes {
  parentCategory: mongoose.Types.ObjectId | null;
  subCategories: mongoose.Types.ObjectId[];
  image: string;
  name: string;
  slug: string;
  status: "active" | "inactive";
  products: mongoose.Types.ObjectId[];
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
}

export interface Option {
  value: string;
  name: string;
}

export interface Field {
  name: string;
  label: string;
  inputType: string;
  inputMinLength?: number | null;
  inputMaxLength?: number | null;
  inputPlaceholder?: string | null;
  inputValidationPattern?: string | null;
  inputRequired: boolean;
  customClassName?: string | null;
  multipleOptions?: Option[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FormField {
  field: Types.ObjectId;
  fieldOrder: number;
}

export interface Form {
  productType: string;
  title: string;
  fields: FormField[];
  status: "active" | "inactive";
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}
