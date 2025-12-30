import Cart from "../models/cartModel";
import Product from "../models/product.model";
import Order from "../models/orderModel";
import {checkPermission} from "../helpers/authHelper";
import { NextFunction, Request, Response } from "express";
import User from "../models/user.model";
import { CustomError } from "../middlewares/error";
import { Types } from "mongoose";
import { CartProduct } from "../types/cartTypes";

// Helper function to validate cart items
const validateCartItems = async (products: CartProduct[]) => {
  const productIds = products.map((item) => item.product._id);
  const existingProducts = await Product.find({ _id: { $in: productIds } });

  // Create a map for quick lookup
  const productMap = new Map(
    existingProducts.map((product) => [product._id.toString(), product])
  );

  for (const item of products) {
    if (!productMap.has(item.product._id.toString())) {
      throw new CustomError(
        404,
        `Product with ID ${item.product._id} not found.`
      );
    }
  }
};

// Helper function to handle free products
const handleFreeProducts = async (
  userId: Types.ObjectId,
  products: CartProduct[]
) => {
  const productIds = products.map((item) => item.product._id);
  const existingProducts = await Product.find({ _id: { $in: productIds } });

  // Create a map for quick lookup
  const productMap = new Map(
    existingProducts.map((product) => [product._id.toString(), product])
  );

  const freeProductIds = existingProducts
    .filter((product) => product.isFreeProduct)
    .map((product) => product._id.toString());

  if (freeProductIds.length > 0) {
    const [existingCart, existingOrders] = await Promise.all([
      Cart.findOne({ userId }),
      Order.find({
        userId,
        "products.product": { $in: freeProductIds },
        paymentStatus: "Paid",
      }),
    ]);

    // Check if free products are already in the cart
    if (existingCart) {
      const cartProductIds = existingCart.products.map((item) =>
        item.product._id.toString()
      );

      for (const productId of freeProductIds) {
        if (cartProductIds.includes(productId)) {
          const product = productMap.get(productId);
          throw new CustomError(
            400,
            `You cannot add the free product (${product?.name}) to the cart more than once.`
          );
        }
      }
    }

    // Check if free products have already been purchased
    if (existingOrders.length > 0) {
      for (const order of existingOrders) {
        for (const productId of freeProductIds) {
          if (
            order.products.some(
              (item) => item.product._id.toString() === productId
            )
          ) {
            const product = productMap.get(productId);
            throw new CustomError(
              400,
              `You have already purchased the free product (${product?.name}).`
            );
          }
        }
      }
    }
  }
};

// Helper function to recalculate cart totals
const recalculateCartTotals = (cart: any) => {
  cart.totalQuantity = cart.products.length;
  cart.totalPrice = cart.products.reduce(
    (acc: number, product: any) => acc + product.totalPrice,
    0
  );
};

// *********************************************************
// ***** Add Product to Cart / Sync Cart with Frontend *****
// *********************************************************
export const syncOrAddToCart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, body } = req;
    const { products } = body;

    if (!products || products.length === 0) {
      return next(new CustomError(400, "Cart cannot be empty."));
    }

    // Validate cart items and handle free products in parallel
    await Promise.all([
      validateCartItems(products),
      handleFreeProducts(new Types.ObjectId(userId), products),
    ]);

    // Find the user's cart or create one if it doesn't exist
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        products: [],
        totalQuantity: 0,
        totalPrice: 0,
      });

      // Update the user's cart reference
      await User.findByIdAndUpdate(userId, { cart: cart._id });
    }

    // Add items to the cart
    for (const item of products) {
      cart.products.push(item);
    }

    // Recalculate total quantity and price
    recalculateCartTotals(cart);

    // Save the cart
    await cart.save();

    // Populate the product field in the cart
    const populatedCart = await Cart.findById(cart._id).populate({
      path: "products.product",
    });

    if (!populatedCart) {
      return next(new CustomError(404, "Cart not found after population."));
    }

    res.status(200).json({
      message: "Product added successfully",
      cart: populatedCart,
    });
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};

// ***************************************
// ********* Get Cart for a User *********
// ***************************************
export const getUserCart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;
    const { customerId } = req.query;

    // Check Permission
    if (customerId) {
      const permissionCheck = await checkPermission(userId, "carts", 2);
      if (!permissionCheck) {
        return next(new CustomError(403, "Permission denied"));
      }
    }

    // Fetch cart based on customerId or all carts
    const targetUserId = customerId ? customerId : userId;
    const cart = await Cart.findOne({ userId: targetUserId }).populate({
      path: "products.product",
      populate: {
        path: "subCategory",
        select: "name",
      },
    });

    if (!cart || (customerId && cart.userId.toString() !== customerId)) {
      return res.status(404).json({ message: "Cart not found for this user." });
    }

    return res.status(200).json({
      message: "Cart data fetched successfully",
      cart,
    });
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};

// ***************************************
// ********* Update Cart Product *********
// ***************************************
export const updateCart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;
    const { cartItemId, ...updateFields } = req.body;

    if (!cartItemId) {
      return next(new CustomError(400, "Product entry ID is required."));
    }

    // Find the user's cart
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return next(new CustomError(404, "Cart not found."));
    }

    // Find the specific product entry by its unique ID
    const productIndex = cart.products.findIndex(
      (p) => p._id.toString() === cartItemId
    );
    if (productIndex === -1) {
      return next(new CustomError(404, "Product entry not found in cart."));
    }

    // Capture original product data for comparison
    const originalProduct = { ...cart.products[productIndex].toObject() };
    delete originalProduct._id;

    // Update the product fields
    const product = cart.products[productIndex];
    const updatedProduct: Record<string, any> = { ...product.toObject() };
    let hasChanges = false;

    Object.keys(updateFields).forEach((key) => {
      if (key in product && updateFields[key] !== undefined) {
        updatedProduct[key] = updateFields[key];
        if (originalProduct[key] !== updateFields[key]) {
          hasChanges = true;
        }
      }
    });

    // If no changes detected, return early
    if (!hasChanges) {
      const populatedCart = await Cart.findById(cart._id).populate({
        path: "products.product",
      });
      if (!populatedCart) {
        return next(new CustomError(404, "Cart not found after population."));
      }
      return res.status(200).json({
        message: "No changes in cart data",
        cart: populatedCart,
      });
    }

    // Apply updates to the cart product
    Object.keys(updatedProduct).forEach((key) => {
      if (key in product && updatedProduct[key] !== undefined) {
        (product as any)[key] = updatedProduct[key];
      }
    });

    // Recalculate total quantity and total price
    recalculateCartTotals(cart);

    // Save the updated cart
    await cart.save();

    // Populate the product field in the cart
    const populatedCart = await Cart.findById(cart._id).populate({
      path: "products.product",
    });

    if (!populatedCart) {
      return next(new CustomError(404, "Cart not found after population."));
    }

    res.status(200).json({
      message: "Cart updated successfully",
      cart: populatedCart,
    });
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};
// ***************************************
// ***** Remove Product from Cart ********
// ***************************************
export const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;
    const { cartItemId } = req.query;

    if (!cartItemId) {
      return next(new CustomError(400, "Product entry ID is required."));
    }

    // Check if the cart exists
    const cart = await Cart.findOne({ userId: userId });
    if (!cart) {
      return next(new CustomError(404, "Cart not found."));
    }

    // Find the product to remove
    const productIndex = cart.products.findIndex(
      (p) => p._id.toString() === cartItemId.toString()
    );
    if (productIndex === -1) {
      return next(new CustomError(404, "Product entry not found in cart."));
    }

    // Remove the product from the cart
    cart.products.splice(productIndex, 1);

    // Recalculate total quantity and total price
    recalculateCartTotals(cart);

    // Save the updated cart
    await cart.save();

    // Populate the product field in the cart
    const populatedCart = await Cart.findById(cart._id).populate({
      path: "products.product",
    });

    if (!populatedCart) {
      return next(new CustomError(404, "Cart not found after population."));
    }

    res.status(200).json({
      message: "Product removed from cart",
      cart: populatedCart,
    });
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};

// ***************************************
// ************ Empty Cart ***************
// ***************************************
export const emptyCart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;
    const { customerId } = req.query;

    // Check Permission
    if (customerId) {
      const permissionCheck = await checkPermission(userId, "carts", 3);
      if (!permissionCheck) {
        return next(new CustomError(403, "Permission denied"));
      }
    }

    // Fetch cart based on customerId or all carts
    const query = customerId ? { userId: customerId } : {};
    const cart = await Cart.findOne(query);
    if (!cart || (customerId && cart.userId.toString() !== customerId)) {
      return next(new CustomError(404, "Cart not found"));
    }

    cart.products = [];
    cart.totalQuantity = 0;
    cart.totalPrice = 0;

    await cart.save();

    // Find the user and clear the cart reference
    const user = await User.findById(userId);
    if (!user) {
      return next(new CustomError(404, "User not found"));
    }

    user.cart = null;

    // Save the updated user
    await user.save();

    res.status(200).json({ message: "Cart cleared successfully", cart });
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};
