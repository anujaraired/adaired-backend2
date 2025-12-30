import User from "../models/user.model";
import { NextFunction, Request, Response } from "express";
import { CustomError } from "../middlewares/error";
import { validateInput } from "../utils/validateInput";
import {checkPermission} from "../helpers/authHelper";
import Cart from "../models/cartModel";
import mongoose from "mongoose";
import Role from "../models/role.model";

// ***************************************
// ************ Find User ****************
// ***************************************
const findUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req;
    const identifier = req.query.identifier as string | undefined;

    // Check permission early (assumes userId is string)
    if (!(await checkPermission(userId, "users", 1))) {
      throw new CustomError(403, "Permission denied");
    }

    let result;
    if (identifier) {
      result = await User.findById(identifier).populate("role").lean();
      if (!result) throw new CustomError(404, "User not found");
    } else {
      result = await User.find().populate("role").lean();
      if (result.length === 0) throw new CustomError(404, "No users found");
    }

    res.status(200).json({ data: result });
  } catch (error) {
    next(
      error instanceof CustomError
        ? error
        : new CustomError(500, "Failed to fetch users")
    );
  }
};

// ***************************************
// ************ Update User **************
// ***************************************
const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, body } = req;
    const identifier = req.query.identifier as string | undefined;

    // Validate target ID (use userId if identifier is not provided)
    const targetId = identifier || userId;
    if (!targetId) {
      throw new CustomError(400, "User ID is required");
    }

    // Convert to strings for consistency (assuming userId might be ObjectId)
    const userIdStr = userId.toString();
    const targetIdStr = targetId.toString();

    // Prevent password updates (fast check)
    if ("password" in body) {
      throw new CustomError(
        403,
        "Password updates are not allowed through this endpoint"
      );
    }

    // Step 1: Check if the requesting user is an admin
    const requestingUser = await User.findById(userIdStr)
      .select("isAdmin")
      .lean();
    if (!requestingUser) {
      throw new CustomError(404, "Requesting user not found");
    }

    // Prepare update data
    const updateData: Record<string, any> = {};
    let allowedFields: string[];

    if (requestingUser.isAdmin) {
      // Admins can update any field except password
      allowedFields = Object.keys(User.schema.paths).filter(
        (field) => field !== "password" && field !== "__v"
      );
    } else {
      // Step 2: If not admin, check permissions
      const hasPermission = await checkPermission(userIdStr, "users", 2);
      if (hasPermission) {
        // Users with permission can update any field except password
        allowedFields = Object.keys(User.schema.paths).filter(
          (field) => field !== "password" && field !== "__v"
        );
      } else {
        // Step 3: If no permissions, allow self-update with limited fields
        allowedFields = ["name", "userName", "contact", "image"];
        if (userIdStr !== targetIdStr) {
          throw new CustomError(403, "You can only update your own account");
        }
      }
    }

    // Filter body to allowed fields only
    Object.keys(body).forEach((key) => {
      if (allowedFields.includes(key)) {
        updateData[key] = body[key];
      }
    });

    // If no valid fields provided, return early
    if (Object.keys(updateData).length === 0) {
      throw new CustomError(400, "No valid fields provided for update");
    }

    // Validate input
    if (!validateInput(req, res)) return;

    // Handle rare role update case with transaction
    if ("role" in body) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const roleDoc = await Role.findById(body.role).session(session).lean();
        if (!roleDoc) {
          throw new CustomError(404, "Role not found");
        }
        const users = roleDoc.users || [];
        if (!users.some((id: any) => id.toString() === targetIdStr)) {
          users.push(new mongoose.Types.ObjectId(targetIdStr));
          await Role.updateOne(
            { _id: body.role },
            { $set: { users } },
            { session }
          );
        }
        updateData.role = body.role;

        const updatedUser = await User.findByIdAndUpdate(
          targetIdStr,
          { $set: updateData },
          { new: true, runValidators: true, lean: true, session }
        );

        if (!updatedUser) {
          throw new CustomError(404, "User not found");
        }

        await session.commitTransaction();
        res.status(200).json({
          message: "User updated successfully",
          data: updatedUser,
        });
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } else {
      // Common case: no role update, no transaction
      const updatedUser = await User.findByIdAndUpdate(
        targetIdStr,
        { $set: updateData },
        { new: true, runValidators: true, lean: true }
      );

      if (!updatedUser) {
        throw new CustomError(404, "User not found");
      }

      res.status(200).json({
        message: "User updated successfully",
        data: updatedUser,
      });
    }
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};

// ***************************************
// ************ Kill User ****************
// ***************************************
const killUser = async (req: Request, res: Response, next: NextFunction) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId } = req;
    const identifier = req.query.identifier as string | undefined;

    // Validate input early
    if (!identifier) {
      throw new CustomError(400, "User ID is required");
    }

    // Ensure consistent type for comparison
    const userIdStr = userId.toString();
    const targetIdStr = identifier;

    // Check permission
    if (!(await checkPermission(userIdStr, "users", 3))) {
      throw new CustomError(403, "Permission denied");
    }

    // Prevent self-deletion
    if (userIdStr === targetIdStr) {
      throw new CustomError(403, "You cannot delete your own account");
    }

    // Delete user within transaction
    const killedUser = await User.findByIdAndDelete(targetIdStr)
      .session(session)
      .lean();
    if (!killedUser) {
      throw new CustomError(404, "User not found");
    }

    // Delete associated cart within transaction
    const cartResult = await Cart.deleteOne({ userId: targetIdStr }).session(
      session
    );
    if (cartResult.deletedCount === 0) {
      console.warn(`No cart found for user ${targetIdStr}`);
    }

    // Commit transaction
    await session.commitTransaction();

    res.status(200).json({
      message: "User and associated cart deleted successfully",
      data: killedUser,
    });
  } catch (error) {
    await session.abortTransaction();
    next(
      error instanceof CustomError
        ? error
        : new CustomError(500, "Failed to delete user")
    );
  } finally {
    session.endSession();
  }
};

// ***************************************
// ********* Get Current User ************
// ***************************************
const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req;
    const user = await User.findById(userId)
      .populate("role", "name permissions")
      .lean();

    if (!user) {
      throw new CustomError(404, "User not found");
    }

    res.status(200).json({ data: user });
  } catch (error) {
    next(
      error instanceof CustomError
        ? error
        : new CustomError(500, "Failed to fetch user")
    );
  }
};

export { findUser, updateUser, killUser, getCurrentUser };
