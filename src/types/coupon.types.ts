import { Types } from "mongoose";

export interface CouponTypes {
  _id?: Types.ObjectId;
  code: string;
  couponApplicableOn: "allProducts" | "specificProducts" | "productCategories";
  couponType: "all" | "quantityBased";
  discountType: "percentage" | "flat";
  discountValue: number; // Percentage (0-100) for percentage; flat amount for flat
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  specificProducts?: Types.ObjectId[];
  productCategories?: Types.ObjectId[];
  minQuantity?: number;
  maxQuantity?: number;
  maxWordCount?: number;
  usageLimitPerUser?: number;
  totalUsageLimit?: number;
  usedCount?: number;
  userUsage?: {
    userId: Types.ObjectId;
    usageCount: number;
  }[];
  status?: string;
  expiresAt?: Date;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}