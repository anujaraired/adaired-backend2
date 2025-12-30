import mongoose, { Schema } from "mongoose";
import { UserTypes } from "../types/user.types";

const UserSchema = new Schema<UserTypes>(
  {
    image: { type: String, default: null },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    userName: { type: String },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, default: null },
    contact: { type: String, default: null },
    isAdmin: { type: Boolean, default: false },
    role: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      default: null,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    orderHistory: {
      type: [{ type: Schema.Types.ObjectId, ref: "Order" }],
      default: [],
    },
    cart: {
      type: Schema.Types.ObjectId,
      ref: "Cart",
      default: null,
    },
    wishlist: {
      type: [
        {
          productId: { type: Schema.Types.ObjectId, ref: "Product" },
          dateAdded: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    status: {
      type: String,
      default: "Active",
    },
    isVerifiedUser: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const User = mongoose.model<UserTypes>("User", UserSchema);

export default User;
