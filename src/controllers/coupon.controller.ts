import { Types } from "mongoose";
import Coupon from "../models/coupon.model";
import { CustomError } from "../middlewares/error";
import { checkPermission } from "../helpers/authHelper";
import { validateInput } from "../utils/validateInput";
import { NextFunction, Request, Response } from "express";
import Product from "../models/product.model";
import Product_Category from "../models/product-category.model";

// Helper function to validate discount against minimum order amount
const validateDiscountVsMinOrder = (coupon: any) => {
  if (coupon.minOrderAmount && coupon.discountType === "flat") {
    if (coupon.discountValue > coupon.minOrderAmount) {
      throw new CustomError(
        400,
        `Discount value ($${coupon.discountValue}) cannot exceed the minimum order amount ($${coupon.minOrderAmount}) for a flat discount coupon`
      );
    }
  }
};

// Helper function to calculate discount
export const calculateDiscount = (
  coupon: any,
  cartData: {
    products: {
      product:
        | Types.ObjectId
        | { _id: Types.ObjectId; category: Types.ObjectId };
      quantity: number;
      wordCount: number;
      totalPrice: number;
      [key: string]: any;
    }[];
    totalPrice: number;
    totalQuantity: number;
  }
): {
  discount: number;
  discountedTotal: number;
  appliedTo?: Types.ObjectId[];
} => {
  let discount = 0;
  let discountedTotal = cartData.totalPrice;
  let appliedTo: Types.ObjectId[] = [];

  // Validate discount vs minimum order amount
  validateDiscountVsMinOrder(coupon);

  // Filter products based on couponApplicableOn
  let eligibleProducts = cartData.products;
  if (coupon.couponApplicableOn === "specificProducts") {
    eligibleProducts = cartData.products.filter((p) =>
      coupon.specificProducts.some((sp: Types.ObjectId) =>
        sp.equals(typeof p.product === "object" ? p.product._id : p.product)
      )
    );
  } else if (coupon.couponApplicableOn === "productCategories") {
    eligibleProducts = cartData.products.filter((p) =>
      coupon.productCategories.some((cat: Types.ObjectId) =>
        cat.equals(
          typeof p.product === "object" && "category" in p.product
            ? p.product.category
            : p.product
        )
      )
    );
  }

  if (
    (coupon.couponApplicableOn === "specificProducts" ||
      coupon.couponApplicableOn === "productCategories") &&
    eligibleProducts.length === 0
  ) {
    throw new CustomError(
      400,
      `No qualifying products found for coupon "${coupon.code}"`
    );
  }

  // Special handling for 100% off coupons (percentage only)
  if (coupon.discountType === "percentage" && coupon.discountValue === 100) {
    const qualifyingProducts = eligibleProducts.filter(
      (product) =>
        !coupon.maxWordCount || product.wordCount <= coupon.maxWordCount
    );

    if (qualifyingProducts.length === 0) {
      throw new CustomError(
        400,
        coupon.maxWordCount
          ? `Coupon "${coupon.code}" requires items with ≤ ${coupon.maxWordCount} words`
          : `No items qualify for coupon "${coupon.code}"`
      );
    }

    const productToDiscount = qualifyingProducts.reduce((lowest, current) =>
      current.totalPrice < lowest.totalPrice ? current : lowest
    );

    if (productToDiscount.quantity !== 1) {
      throw new CustomError(
        400,
        `"${coupon.code}" applies to single-item purchases only. Please remove other items and set quantity to 1 to enjoy this discount.`
      );
    }

    discount = productToDiscount.totalPrice;
    discountedTotal = cartData.totalPrice - discount;
    appliedTo = [
      typeof productToDiscount.product === "object"
        ? productToDiscount.product._id
        : productToDiscount.product,
    ];

    return { discount, discountedTotal, appliedTo };
  }

  // Check couponType
  if (coupon.couponType === "quantityBased") {
    const hasEnoughQuantity = eligibleProducts.some(
      (p) => p.quantity >= (coupon.minQuantity || 1)
    );
    if (!hasEnoughQuantity) {
      throw new CustomError(
        400,
        `Minimum quantity of ${coupon.minQuantity} required for coupon "${coupon.code}"`
      );
    }
  }

  // Calculate discount based on discountType
  const eligibleTotal = eligibleProducts.reduce(
    (sum, p) => sum + p.totalPrice,
    0
  );
  if (coupon.discountType === "percentage") {
    if (cartData.totalPrice < (coupon.minOrderAmount || 0)) {
      throw new CustomError(400, "Minimum order amount not met");
    }
    discount = (eligibleTotal * coupon.discountValue) / 100;
    discount = Math.min(discount, coupon.maxDiscountAmount || Infinity);
  } else if (coupon.discountType === "flat") {
    if (cartData.totalPrice < (coupon.minOrderAmount || 0)) {
      throw new CustomError(400, "Minimum order amount not met");
    }
    discount = coupon.discountValue;
    discount = Math.min(discount, coupon.maxDiscountAmount || Infinity);
  } else {
    throw new CustomError(400, "Invalid discount type");
  }

  appliedTo = eligibleProducts.map((p) =>
    typeof p.product === "object" ? p.product._id : p.product
  );
  discountedTotal = Math.max(0, cartData.totalPrice - discount);
  return { discount, discountedTotal, appliedTo };
};

// Helper to validate and apply coupon
export const applyCoupon = async (
  couponCode: string | undefined,
  cart: any,
  userId: string
): Promise<{
  coupon: any;
  discountUSD: number;
  finalPriceUSD: number;
  appliedTo?: Types.ObjectId[];
  message?: string;
}> => {
  let discountUSD = 0;
  let finalPriceUSD = cart.totalPrice;
  let appliedTo: Types.ObjectId[] = [];

  // Find active coupon
  const coupon = await Coupon.findOne({
    code: couponCode,
    status: "Active",
    $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: null }],
  });

  if (!coupon) {
    throw new CustomError(404, "Invalid or expired coupon");
  }

  // Check is coupon is already used to its limit
  if (coupon.usedCount >= coupon.totalUsageLimit) {
    throw new CustomError(
      400,
      `Coupon "${coupon.code}" has reached its usage limit`
    );
  }
  // Validate discount vs minimum order amount
  validateDiscountVsMinOrder(coupon);

  // Check usage limits
  const userUsage = coupon.userUsage?.find(
    (u: any) => u.userId.toString() === userId
  );

  if (userUsage && userUsage.usageCount >= coupon.usageLimitPerUser) {
    throw new CustomError(
      400,
      `You've reached the usage limit for coupon "${coupon.code}"`
    );
  }

  if (coupon.usedCount >= coupon.totalUsageLimit) {
    throw new CustomError(
      400,
      `Coupon "${coupon.code}" has reached its total usage limit`
    );
  }

  const {
    discount,
    discountedTotal,
    appliedTo: discountedProducts = [],
  } = calculateDiscount(coupon, {
    products: cart.products,
    totalPrice: cart.totalPrice,
    totalQuantity: cart.totalQuantity,
  });

  discountUSD = discount;
  finalPriceUSD = discountedTotal;
  appliedTo = discountedProducts;

  let message = "Coupon applied successfully";
  if (coupon.couponApplicableOn === "specificProducts") {
    if (appliedTo.length === 1) {
      const product = cart.products.find((p: any) =>
        p.product._id.equals(appliedTo[0])
      );
      message = `Discount applied to "${
        product?.product?.name || "your item"
      }"`;
    } else if (appliedTo.length > 1) {
      message = `Discount applied to ${appliedTo.length} products`;
    }
  } else if (coupon.couponApplicableOn === "productCategories") {
    message = `Discount applied to products in selected categories`;
  } else if (
    coupon.discountType === "percentage" &&
    coupon.discountValue === 100
  ) {
    const product = cart.products.find((p: any) =>
      p.product._id.equals(appliedTo[0])
    );
    message = `100% discount applied to "${
      product?.product?.name || "your item"
    }"${coupon.maxWordCount ? ` (max ${coupon.maxWordCount} words)` : ""}`;
  }
  return { coupon, discountUSD, finalPriceUSD, appliedTo, message };
};

// Helper to actually apply coupon usage (call this after successful payment)
export const recordCouponUsage = async (
  couponId: Types.ObjectId,
  userId: string
): Promise<void> => {
  const coupon = await Coupon.findById(couponId);
  if (!coupon) {
    throw new CustomError(404, "Coupon not found");
  }

  // Update coupon usage
  const userUsage = coupon.userUsage?.find(
    (u: any) => u.userId.toString() === userId
  );

  if (userUsage) {
    userUsage.usageCount += 1;
  } else {
    coupon.userUsage = coupon.userUsage || [];
    coupon.userUsage.push({
      userId: new Types.ObjectId(userId),
      usageCount: 1,
    });
  }
  coupon.usedCount += 1;
  await coupon.save();
};

// *********************************************************
// ******************* Create New Coupon *******************
// *********************************************************
export const createCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, body } = req;

    // Check Permission
    const permissionCheck = await checkPermission(userId, "coupons", 0);
    if (!permissionCheck) {
      throw new CustomError(403, "Permission denied");
    }

    // Validate user input
    if (!validateInput(req, res)) return;

    // Validate discount vs minimum order amount
    validateDiscountVsMinOrder(body);

    // Add createdBy field
    const newCoupon = new Coupon({
      ...body,
      createdBy: userId,
      updatedBy: userId,
    });

    await newCoupon.save();
    res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      data: newCoupon,
    });
  } catch (error: any) {
    // Handle validation errors
    if (error.message.includes("required") || error.message.includes("empty")) {
      next(new CustomError(400, error.message));
    } else {
      next(new CustomError(500, error.message));
    }
  }
};

// *********************************************************
// ******************* Apply Coupon ***********************
// *********************************************************
export const calculateCouponDiscount = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { code, localCart } = req.body;

    if (!localCart || !localCart.products || localCart.products.length === 0) {
      return next(new CustomError(400, "Cart cannot be empty"));
    }

    const cartData = localCart;

    if (!code) {
      return res.status(200).json({
        message: "No coupon applied",
        originalTotal: cartData.totalPrice,
        couponDiscount: 0,
        finalPrice: cartData.totalPrice,
        appliedTo: [],
        productDiscounts: {},
        couponDetails: null,
      });
    }

    const coupon = await Coupon.findOne({
      code: code,
      status: "Active",
      $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: null }],
    });

    if (!coupon) {
      return next(new CustomError(404, "Invalid or expired coupon"));
    }

    // Check is coupon is already used to its limit
    if (coupon.usedCount >= coupon.totalUsageLimit) {
      return next(
        new CustomError(
          400,
          `Coupon "${coupon.code}" has reached its usage limit`
        )
      );
    }

    // Validate discount vs minimum order amount
    validateDiscountVsMinOrder(coupon);

    const {
      discount,
      discountedTotal,
      appliedTo = [],
    } = calculateDiscount(coupon, cartData);

    // Build product discounts map with proportional distribution
    const productDiscounts: Record<string, number> = {};
    const eligibleProducts = cartData.products.filter((p: any) =>
      appliedTo.some((id: any) => id.toString() === p.product._id.toString())
    );
    const eligibleTotal = eligibleProducts.reduce(
      (sum: number, p: any) => sum + p.totalPrice,
      0
    );

    // Always distribute the final (capped) discount proportionally
    const finalDiscount = Math.min(
      discount,
      coupon.maxDiscountAmount || Infinity
    );
    if (eligibleTotal === 0) {
      throw new CustomError(400, "No eligible products with valid prices");
    }
    eligibleProducts.forEach((product: any) => {
      const productShare = product.totalPrice / eligibleTotal;
      productDiscounts[product.product._id.toString()] = Number(
        (finalDiscount * productShare).toFixed(2)
      );
    });

    res.status(200).json({
      success: true,
      message: "Coupon discount calculated successfully",
      originalTotal: cartData.totalPrice,
      couponDiscount: finalDiscount,
      finalPrice: discountedTotal,
      appliedTo: appliedTo.map((id: any) => id.toString()),
      productDiscounts,
      couponDetails: {
        code: coupon.code,
        couponApplicableOn: coupon.couponApplicableOn,
        couponType: coupon.couponType,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscountAmount:
          coupon.maxDiscountAmount !== Infinity
            ? coupon.maxDiscountAmount
            : null,
        minOrderAmount:
          coupon.minOrderAmount !== 1 ? coupon.minOrderAmount : null,
        minQuantity: coupon.minQuantity !== 1 ? coupon.minQuantity : null,
        maxWordCount: coupon.maxWordCount,
        specificProducts:
          coupon.couponApplicableOn === "specificProducts"
            ? await Product.find({
                _id: { $in: coupon.specificProducts },
              }).select("name")
            : [],
        productCategories:
          coupon.couponApplicableOn === "productCategories"
            ? await Product_Category.find({
                _id: { $in: coupon.productCategories },
              }).select("name")
            : [],
      },
    });
  } catch (error) {
    next(
      new CustomError(
        500,
        error instanceof Error ? error.message : "An error occurred"
      )
    );
  }
};

// *********************************************************
// ******************* Update Coupon ***********************
// *********************************************************
export const updateCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, body } = req;
    const { id } = req.query;

    // Validate coupon ID exists in query
    if (!id) {
      throw new CustomError(400, "Coupon ID is required in query parameters");
    }

    // Check Permission
    const permissionCheck = await checkPermission(userId, "coupons", 2);
    if (!permissionCheck) {
      throw new CustomError(403, "Permission denied");
    }

    // Find existing coupon
    const existingCoupon = await Coupon.findById(id);
    if (!existingCoupon) {
      throw new CustomError(404, "Coupon not found");
    }

    // Apply updates
    const updates = {
      ...existingCoupon.toObject(),
      ...body,
      updatedBy: userId,
    };

    // Validate discount vs minimum order amount
    validateDiscountVsMinOrder(updates);

    // Save (triggers pre-save validation)
    const updatedCoupon = await Coupon.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      data: updatedCoupon,
    });
  } catch (error: any) {
    // Handle validation errors
    if (error.message.includes("required") || error.message.includes("empty")) {
      next(new CustomError(400, error.message));
    } else {
      next(new CustomError(500, error.message));
    }
  }
};

// *********************************************************
// ******************* Get Coupons *************************
// *********************************************************
export const getCoupons = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, query } = req;
    const { id, status, search } = query;

    // Check Permission
    const permissionCheck = await checkPermission(userId, "coupons", 1);
    if (!permissionCheck) {
      throw new CustomError(403, "Permission denied");
    }

    // If ID is provided, return single coupon
    if (id) {
      const coupon = await Coupon.findById(id)
        .populate("createdBy", "_id name image email")
        .populate("updatedBy", "_id name image email");
      if (!coupon) {
        throw new CustomError(404, "Coupon not found");
      }

      return res.status(200).json({
        message: "Coupon fetched successfully",
        data: coupon,
      });
    }

    // Otherwise, return all coupons with optional filters
    const queryParams: Record<string, any> = {};

    if (status !== undefined) {
      queryParams.status = status === "Active";
    }

    if (search) {
      queryParams.$or = [
        { code: { $regex: search as string, $options: "i" } },
        { description: { $regex: search as string, $options: "i" } },
      ];
    }

    const coupons = await Coupon.find(queryParams)
      .sort({ createdAt: -1 })
      .populate("createdBy", "_id name image email")
      .populate("updatedBy", "_id name image email");

    res.status(200).json({
      success: true,
      message: "Coupons fetched successfully",
      data: coupons,
      count: coupons.length,
    });
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};

// *********************************************************
// ******************* Delete Coupon ***********************
// *********************************************************
export const deleteCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;
    const { id } = req.query;

    // Check Permission
    const permissionCheck = await checkPermission(userId, "coupons", 3);
    if (!permissionCheck) {
      throw new CustomError(403, "Permission denied");
    }

    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) {
      throw new CustomError(404, "Coupon not found");
    }

    res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
      data: coupon,
    });
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};

// *********************************************************
// **************** Get Coupon Usage Stats *****************
// *********************************************************
export const getCouponStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;

    // Check Permission
    const permissionCheck = await checkPermission(userId, "coupons", 1);
    if (!permissionCheck) {
      throw new CustomError(403, "Permission denied");
    }

    const stats = await Coupon.aggregate([
      {
        $group: {
          _id: null,
          totalCoupons: { $sum: 1 },
          activeCoupons: {
            $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] },
          },
          usedCoupons: { $sum: "$usedCount" },
        },
      },
      {
        $project: {
          _id: 0,
          totalCoupons: 1,
          activeCoupons: 1,
          inactiveCoupons: { $subtract: ["$totalCoupons", "$activeCoupons"] },
          usedCoupons: 1,
        },
      },
    ]);

    const popularCoupons = await Coupon.find()
      .sort({ usedCount: -1 })
      .limit(5)
      .select("code usedCount");

    res.status(200).json({
      message: "Coupon stats fetched successfully",
      data: {
        success: true,
        stats: stats[0] || {},
        popularCoupons,
      },
    });
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};
