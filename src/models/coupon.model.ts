import mongoose, { Schema } from "mongoose";
import { CouponTypes } from "../types/coupon.types";

const CouponSchema = new Schema<CouponTypes>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    couponApplicableOn: {
      type: String,
      enum: ["allProducts", "specificProducts", "productCategories"],
      required: true,
    },
    couponType: {
      type: String,
      enum: ["amountBased", "quantityBased"],
      required: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "flat"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function (value: number) {
          if (this.discountType === "percentage") {
            return value <= 100;
          }
          return true;
        },
        message: "Percentage discount must be ≤ 100",
      },
    },
    minOrderAmount: {
      type: Number,
      default: 1,
      min: 1,
    },
    maxDiscountAmount: {
      type: Number,
      default: Infinity,
    },
    specificProducts: {
      type: [{ type: Schema.Types.ObjectId, ref: "Product" }],
      default: [],
    },
    productCategories: {
      type: [{ type: Schema.Types.ObjectId, ref: "Product_Category" }],
      default: [],
    },
    minQuantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    maxQuantity: {
      type: Number,
      default: null,
    },
    maxWordCount: {
      type: Number,
      default: null,
    },
    usageLimitPerUser: {
      type: Number,
      default: Infinity,
    },
    totalUsageLimit: {
      type: Number,
      default: Infinity,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    userUsage: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        usageCount: { type: Number, default: 0 },
      },
    ],
    status: {
      type: String,
      default: "Active",
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Universal validation (works for both create & update)
CouponSchema.pre("save", function (next) {
  // Validate productCategories
  if (this.couponApplicableOn === "productCategories" && this.productCategories.length === 0) {
    return next(new Error("At least one product category is required"));
  }
  if (this.couponApplicableOn !== "productCategories" && this.productCategories.length > 0) {
    return next(new Error("Product categories must be empty for non-category coupons"));
  }

  // Validate specificProducts
  if (this.couponApplicableOn === "specificProducts" && this.specificProducts.length === 0) {
    return next(new Error("At least one product is required"));
  }
  if (this.couponApplicableOn !== "specificProducts" && this.specificProducts.length > 0) {
    return next(new Error("Specific products must be empty for non-product-specific coupons"));
  }

  next();
});

CouponSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model<CouponTypes>("Coupon", CouponSchema);