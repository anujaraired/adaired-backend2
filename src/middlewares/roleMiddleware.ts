import { NextFunction, Request, Response } from "express";
import { CustomError } from "./error";
import jwt, { JwtPayload } from "jsonwebtoken";
import User from "../models/user.model";
import { RoleTypes } from "../types/roleTypes";

const verifyRoleAndPermission = async (
  req: Request,
  res: Response,
  next: NextFunction,
  role: RoleTypes[]
) => {
  const ad_access = req.cookies.ad_access;
  if (!ad_access) {
    return next(new CustomError(401, "No token, authorization denied"));
  }
  try {
    const payload = jwt.verify(ad_access, process.env.JWT_SECRET) as JwtPayload;
    const user = await User.findById(payload._id).select("-password");
    if (!user) {
      return next(new CustomError(401, "Token is not valid"));
    }
    if (user.isAdmin) {
      next();
    } else {
      
    }
  } catch (error) {
    next(error);
  }
};

export default verifyRoleAndPermission;
