import { Types } from "mongoose";
import { ProductTypes } from "./productTypes";

export interface CartProduct {
  _id?: Types.ObjectId;
  product: ProductTypes;
  wordCount?: number;
  quantity: number;
  additionalInfo?: string;
  totalPrice: number;
  addedAt?: Date;
  [key: string]: any;
}

export interface CartTypes {
  userId: Types.ObjectId | string;
  products: CartProduct[];
  totalQuantity: number;
  totalPrice: number;
  createdAt?: Date;
  updatedAt?: Date;
}
