import FieldModel from "../models/field.model";
import FormModel from "../models/form.model"; // Imported to update forms when deleting fields
import { NextFunction, Request, Response } from "express";
import { CustomError } from "../middlewares/error";
import { checkPermission } from "../helpers/authHelper";

// ***************************************
// ********** Create Field ***************
// ***************************************
export const createField = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { body, userId } = req;
    const {
      name,
      label,
      inputType,
      inputMinLength,
      inputMaxLength,
      inputPlaceholder,
      inputValidationPattern,
      inputRequired,
      customClassName,
      multipleOptions,
    } = body;

    // Check permissions
    const permissionCheck = await checkPermission(userId, "fields", 0);
    if (!permissionCheck) {
      throw new CustomError(403, "Unauthorized");
    }

    // Validate required fields
    if (!name || !label || !inputType) {
      throw new CustomError(400, "Name, Label, and Input Type are required");
    }

    const field = await FieldModel.create({
      name,
      label,
      inputType,
      inputMinLength: inputMinLength || null,
      inputMaxLength: inputMaxLength || null,
      inputPlaceholder: inputPlaceholder || null,
      inputValidationPattern: inputValidationPattern || null,
      inputRequired: inputRequired || false,
      customClassName: customClassName || null,
      multipleOptions: multipleOptions || [],
    });

    res.status(201).json({
      success: true,
      message: "Field created successfully",
      field,
    });
  } catch (error: any) {
    next(new CustomError(500, error.message || "Error creating field"));
  }
};

// ***************************************
// ********** Read Fields ****************
// ***************************************
export const readFields = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const fields = await FieldModel.find().sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      message: "Fields retrieved successfully",
      fields,
    });
  } catch (error) {
    next(new CustomError(500, "Error reading fields"));
  }
};

// ***************************************
// ********** Update Field ***************
// ***************************************
export const updateField = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, body, query } = req;
    const { fieldId } = query as { fieldId?: string };
    const {
      name,
      label,
      inputType,
      inputMinLength,
      inputMaxLength,
      inputPlaceholder,
      inputValidationPattern,
      inputRequired,
      customClassName,
      multipleOptions,
    } = body;

    // Check permissions
    const permissionCheck = await checkPermission(userId, "fields", 2);
    if (!permissionCheck) {
      throw new CustomError(403, "Unauthorized");
    }

    if (!fieldId) {
      throw new CustomError(400, "Missing required parameter: fieldId");
    }

    const updatedField = await FieldModel.findByIdAndUpdate(
      fieldId,
      {
        name,
        label,
        inputType,
        inputMinLength: inputMinLength || null,
        inputMaxLength: inputMaxLength || null,
        inputPlaceholder: inputPlaceholder || null,
        inputValidationPattern: inputValidationPattern || null,
        inputRequired: inputRequired || false,
        customClassName: customClassName || null,
        multipleOptions: multipleOptions || [],
      },
      { new: true }
    );
    if (!updatedField) {
      throw new CustomError(404, "Field not found");
    }

    res.status(200).json({
      success: true,
      message: "Field updated successfully",
      field: updatedField,
    });
  } catch (error) {
    next(
      error instanceof CustomError
        ? error
        : new CustomError(500, "Error updating field")
    );
  }
};

// ***************************************
// ********** Delete Field ***************
// ***************************************
export const deleteField = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, query } = req;
    const { fieldId } = query as { fieldId?: string };

    // Check permissions
    const permissionCheck = await checkPermission(userId, "fields", 3);
    if (!permissionCheck) {
      throw new CustomError(403, "Unauthorized");
    }

    if (!fieldId) {
      throw new CustomError(400, "Missing required parameter: fieldId");
    }

    const field = await FieldModel.findByIdAndDelete(fieldId);
    if (!field) {
      throw new CustomError(404, "Field not found");
    }

    // Remove field references from all forms
    await FormModel.updateMany(
      { "fields.field": fieldId },
      { $pull: { fields: { field: fieldId } } }
    );

    res.status(200).json({
      success: true,
      message: "Field deleted successfully",
    });
  } catch (error) {
    next(new CustomError(500, "Error deleting field"));
  }
};
