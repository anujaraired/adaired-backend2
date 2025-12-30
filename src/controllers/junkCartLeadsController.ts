// import JunkCartLeads from "../models/junkCartLeadsModel";
// import { NextFunction, Request, Response } from "express";
// import User from "../models/userModel";
// import { generateUserId } from "../helpers/generateGuestId";
// import { CustomError } from "../middlewares/error";
// import { Types } from "mongoose";
// import Product from "../models/productModel";

// // *********************************************************
// // ***** Add Product to Cart / Sync Cart with Frontend *****
// // *********************************************************
// export const syncOrAddToJunkCart = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { body } = req;
//     const { userId, cartItems } = body;
//     let user = userId || generateUserId();

//     // Find the user's cart or create one if it doesn't exist
//     let cart = await JunkCartLeads.findOne({ userId: user });

//     if (!cart) {
//       // Create a new cart if one doesn't exist
//       cart = new JunkCartLeads({
//         userId: user,
//         products: [],
//         totalQuantity: 0,
//         totalPrice: 0,
//       });

//       // Optionally link the cart to a User document, if applicable
//       if (userId) {
//         const existingUser = await User.findOne({ userId });
//         if (existingUser) {
//           existingUser.cart = cart._id; // Link the cart to the user
//           await existingUser.save();
//         }
//       }
//     }

//     // Check for free products and prevent a user from adding it more than once
//     for (const item of cartItems) {
//       const product = await Product.findById(item.productId);

//       if (!product) {
//         return next(
//           new CustomError(404, `Product with ID ${item.productId} not found.`)
//         );
//       }

//       // Handle free products
//       if (product.isFreeProduct) {
//         // Check if the product is already in the cart
//         const alreadyInCart = cart.products.some(
//           (cartItem: any) => cartItem.productId.toString() === item.productId
//         );

//         if (alreadyInCart) {
//           return next(
//             new CustomError(
//               400,
//               `You cannot add the free product (${product.name}) to the cart more than once.`
//             )
//           );
//         }
//       }
//       // Add the item to the cart
//       cart.products.push(item);
//     }

//     // Recalculate total quantity and price
//     cart.totalQuantity = cart.products.length;
//     cart.totalPrice = cart.products.reduce(
//       (acc: number, product: any) => acc + product.totalPrice,
//       0
//     );

//     // Save the cart
//     await cart.save();

//     res.status(200).json({
//       message: "Product added successfully",
//       guestId: user,
//       data: cart,
//     });
//   } catch (error: any) {
//     next(new CustomError(500, error.message));
//   }
// };

// // ***************************************
// // ********* Get Cart for a User *********
// // ***************************************
// export const getUserCart = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { tempUserId } = req.query;

//     if (tempUserId) {
//       const cart = await JunkCartLeads.findOne({
//         userId: tempUserId,
//       }).populate({
//         path: "products.productId",
//         populate: {
//           path: "subCategory",
//           select: "name",
//         },
//       });
//       if (!cart) {
//         return res.status(404).json({ message: "Cart not found" });
//       }

//       res.status(200).json({
//         message: "Cart data fetched successfully",
//         data: cart,
//       });
//     } else {
//       const carts = await JunkCartLeads.find().populate({
//         path: "products.productId",
//         populate: {
//           path: "subCategory",
//           select: "name",
//         },
//       });
//       res.status(200).json({
//         message: "Cart data fetched successfully",
//         data: carts,
//       });
//     }
//   } catch (error: any) {
//     next(new CustomError(500, error.message));
//   }
// };

// // ***************************************
// // ********* Update Cart Product *********
// // ***************************************
// export const updateCart = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const { userId } = req.query;
//   const { ...updateFields } = req.body;

//   try {
//     // Check if the cart exists
//     const cart = await JunkCartLeads.findOne({
//       userId: userId,
//     });

//     if (!cart) {
//       return res.status(404).json({ message: "Cart not found" });
//     }

//     // Find the product to update
//     const product = cart.products.find((p) =>
//       p._id.equals(new Types.ObjectId(updateFields.productEntryId))
//     );

//     if (!product) {
//       return res.status(404).json({ message: "Product not found in cart" });
//     }

//     // Dynamically update the product fields from the request body
//     Object.keys(updateFields).forEach((key) => {
//       if (key in product) {
//         (product as any)[key] = updateFields[key];
//       }
//     });

//     // Recalculate total quantity and total price
//     cart.totalQuantity = cart.products.length;
//     cart.totalPrice = cart.products.reduce((acc, p) => acc + p.totalPrice, 0);

//     // Save the updated cart
//     await cart.save();

//     res.status(200).json({
//       message: "Cart updated successfully",
//       data: cart,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// // ***************************************
// // ***** Remove Product from Cart ********
// // ***************************************
// export const deleteProduct = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const { userId, productEntryId } = req.query;

//   try {
//     // Check if the cart exists
//     const cart = await JunkCartLeads.findOne({ userId: userId });
//     if (!cart) {
//       return res.status(404).json({ message: "Cart not found" });
//     }

//     // Find the product to remove
//     const productIndex = cart.products.findIndex((p) =>
//       p._id.equals(new Types.ObjectId(productEntryId as string))
//     );

//     if (productIndex === -1) {
//       return res.status(404).json({ message: "Product not found in cart" });
//     }

//     // Remove the product from the cart
//     cart.products.splice(productIndex, 1);

//     // Recalculate total quantity and total price
//     cart.totalQuantity = cart.products.length;
//     cart.totalPrice = cart.products.reduce((acc, p) => acc + p.totalPrice, 0);

//     // Save the updated cart
//     await cart.save();

//     res.status(200).json({
//       message: "Product removed from cart",
//       data: cart,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// // ***************************************
// // ************ Empty Cart ***************
// // ***************************************
// export const emptyCart = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const { userId } = req.query;

//   try {
//     const cart = await JunkCartLeads.findOne({ userId: userId });
//     if (!cart) {
//       return res.status(404).json({ message: "Cart not found" });
//     }

//     cart.products = [];
//     cart.totalQuantity = 0;
//     cart.totalPrice = 0;

//     await cart.save();

//     // Find the user and clear the cart reference
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     user.cart = null;

//     // Save the updated user
//     await user.save();

//     res.status(200).json({ message: "Cart cleared successfully" });
//   } catch (error) {
//     next(error);
//   }
// };

// // ***************************************
// // ************ Delete Cart ***************
// // ***************************************
// export const deleteCart = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const { userId } = req.query;

//   try {
//     const cart = await JunkCartLeads.findOneAndDelete({ userId: userId });
//     if (!cart) {
//       return res.status(404).json({ message: "Cart not found" });
//     }
//     res.status(200).json({ message: "Cart Deleted Successfully" });
//   } catch (error) {
//     next(error);
//   }
// };
