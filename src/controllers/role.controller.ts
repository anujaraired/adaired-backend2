import Role from "../models/role.model";
import User from "../models/user.model";
import { NextFunction, Request, Response } from "express";
import { CustomError } from "../middlewares/error";
import { validateInput } from "../utils/validateInput";
import { checkPermission } from "../helpers/authHelper";
import { RoleTypes } from "../types/roleTypes";
import mongoose from "mongoose";

// ***************************************
// ********** Create Role ****************
// ***************************************
const createRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, body } = req;

    const { name } = body;

    if (!(await checkPermission(userId, "roles", 0)))
      throw new CustomError(403, "Permission denied");

    // Validate user input
    if (!validateInput(req, res)) return;

    // Create new role
    const createdRole = await Role.create({
      name: name.toLowerCase(),
      ...body,
    });
    res.status(201).json({
      message: "Role created successfully",
      data: createdRole,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      // Duplicate key error from the case-insensitive unique index
      throw new CustomError(400, "Role name already exists");
    }
    next(new CustomError(500, error.message));
  }
};

// ***************************************
// ********** Read Roles *****************
// ***************************************
const findRoles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req;
    const { identifier } = req.query;

    if (!(await checkPermission(userId, "roles", 1)))
      throw new CustomError(403, "Permission denied");

    if (identifier) {
      const role = await Role.findById(identifier)
        .populate("users", "_id name image")
        .lean();
      res.status(200).json({
        message: "Role fetched successfully",
        data: role,
      });
    } else {
      const roles = await Role.find()
        .populate("users", "_id name image")
        .lean();
      res.status(200).json({
        message: "Roles fetched successfully",
        data: roles,
      });
    }
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};

// ***************************************
// ********** Update Roles ***************
// ***************************************
const updateRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, body } = req;
    const roleId = req.query.identifier as string;

    if (!roleId) throw new CustomError(400, "Role ID is required");
    if (!(await checkPermission(userId, "roles", 2)))
      throw new CustomError(403, "Permission denied");
    if (!validateInput(req, res)) return;

    // Prepare update data based on schema
    const updateData: Partial<RoleTypes> = {};
    if (body.name) updateData.name = body.name;
    if (body.description) updateData.description = body.description;
    if (typeof body.status === "boolean") updateData.status = body.status;
    if (body.permissions) updateData.permissions = body.permissions;

    // If no changes provided, return early
    if (Object.keys(updateData).length === 0) {
      return res.status(200).json({
        message: "No changes provided",
      });
    }

    // Single DB call to update the role
    const updatedRole = await Role.findOneAndUpdate(
      { _id: roleId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedRole) {
      throw new CustomError(404, "Role not found");
    }

    return res.status(200).json({
      message: "Role updated successfully",
      data: updatedRole,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      // Duplicate key error from the case-insensitive unique index
      throw new CustomError(400, "Role name already exists");
    }
    next(new CustomError(500, error.message));
  }
};

// ***************************************
// ********** Delete Roles ***************
// ***************************************
const deleteRole = async (req: Request, res: Response, next: NextFunction) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId } = req;
    const roleId = req.query.identifier as string;

    if (!roleId) throw new CustomError(400, "Role ID is required");
    if (!(await checkPermission(userId, "roles", 3)))
      throw new CustomError(403, "Permission denied");

    // Delete the role within the transaction
    const role = await Role.findByIdAndDelete(roleId, { session });
    if (!role) {
      await session.abortTransaction();
      throw new CustomError(404, "Role not found");
    }

    // Update users who had this role
    await User.updateMany(
      { role: roleId },
      { $set: { role: null } },
      { session }
    );

    // Commit the transaction
    await session.commitTransaction();

    // Convert to plain object to avoid circular references
    const rolePlain = role.toObject();

    res.status(200).json({
      message: "Role deleted successfully",
      data: rolePlain,
    });
  } catch (error: any) {
    // Only abort transaction here if it hasn’t been committed
    await session.abortTransaction();
    next(
      new CustomError(
        error.statusCode || 500,
        error.message || "Internal Server Error"
      )
    );
  } finally {
    session.endSession();
  }
};

// ***************************************
// ********** Duplicate Role *************
// ***************************************
const duplicateRole = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;
    const roleId = req.query.identifier as string;

    if (!roleId) throw new CustomError(400, "Role ID is required");

    // Check permission to create roles
    if (!(await checkPermission(userId, "roles", 0)))
      throw new CustomError(403, "Permission denied");

    // Fetch the existing role
    const originalRole = await Role.findById(roleId).lean();
    if (!originalRole) {
      throw new CustomError(404, "Role not found");
    }

    // Prepare the duplicated role data
    const { name, description, status, permissions } = originalRole;
    let newName = `${name} - Copy`;

    // Ensure the new name is unique (case-insensitive)
    let counter = 1;
    while (
      await Role.findOne({
        name: { $regex: new RegExp(`^${newName}$`, "i") },
      })
    ) {
      newName = `${name} - Copy ${counter}`;
      counter++;
    }

    const duplicateData: Partial<RoleTypes> = {
      name: newName,
      description,
      status,
      permissions,
    };

    // Create the duplicated role
    const duplicatedRole = await Role.create(duplicateData);

    res.status(201).json({
      message: "Role duplicated successfully",
      data: duplicatedRole,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      // Shouldn't happen due to name uniqueness check, but included for safety
      throw new CustomError(400, "Role name conflict occurred");
    }
    next(new CustomError(500, error.message));
  }
};

export { createRole, updateRole, findRoles, deleteRole, duplicateRole };
