import FormModel from "../models/form.model";
import { NextFunction, Request, Response } from "express";
import { CustomError } from "../middlewares/error";
import { checkPermission } from "../helpers/authHelper";

// ***************************************
// ********** Create New Form ************
// ***************************************
export const createForm = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { body, userId } = req;
    let { title, fields } = body;

    // Check permissions
    const permissionCheck = await checkPermission(userId, "custom-forms", 0);
    if (!permissionCheck) {
      throw new CustomError(403, "Unauthorized");
    }

    // Validate and assign field order
    fields = fields.map((field: any, index: number) => ({
      field: field.field,
      fieldOrder: field.fieldOrder || index + 1,
    }));

    const form = await FormModel.create({
      title,
      fields,
      createdBy: userId,
    });

    const populatedForm = await FormModel.findById(form._id)
      .populate("createdBy updatedBy", "name email role isAdmin")
      .populate("fields.field");

    res.status(201).json({
      success: true,
      message: "Form created successfully",
      form: populatedForm,
    });
  } catch (error: any) {
    if (error instanceof CustomError) {
      next(new CustomError(500, "Error creating form"));
    }
  }
};

// ***************************************
// ********** Read Form ******************
// ***************************************
export const readForm = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { formId, ...queryParams } = req.query;

    const filter: Record<string, any> = { ...queryParams };

    if (formId) {
      const form = await FormModel.findById(formId)
        .populate("createdBy updatedBy", "name email role isAdmin")
        .populate("fields.field")
        .lean();

      if (!form) {
        throw new CustomError(404, "Form not found");
      }

      res.json({ success: true, form });
    } else {
      const forms = await FormModel.find(filter)
        .populate("createdBy updatedBy", "name email role isAdmin")
        .populate("fields.field")
        .sort({ createdAt: -1 })
        .lean();

      res.json({
        success: true,
        message: "Forms retrieved successfully",
        forms,
      });
    }
  } catch (error) {
    console.error("Error reading form:", error);
    next(new CustomError(500, "Error reading form"));
  }
};

// ***************************************
// ********** Update Form ****************
// ***************************************
export const updateForm = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, body, query } = req;
    const { formId } = query as { formId?: string };

    // Check permissions
    const permissionCheck = await checkPermission(userId, "custom-forms", 2);
    if (!permissionCheck) {
      throw new CustomError(403, "Unauthorized");
    }

    if (!formId) {
      return next(
        new CustomError(400, "Missing required query parameter: formId")
      );
    }

    // Handle status toggle if provided
    if (
      body.status !== undefined &&
      !["active", "inactive"].includes(body.status)
    ) {
      throw new CustomError(
        400,
        "Invalid status value. Use 'active' or 'inactive'"
      );
    }

    // Update field orders if provided
    if (body.fields) {
      body.fields = body.fields.map((field: any, index: number) => ({
        field: field.field,
        fieldOrder: field.fieldOrder || index + 1,
      }));
    }

    const updatedForm = await FormModel.findByIdAndUpdate(formId, body, {
      new: true,
    });
    if (!updatedForm) {
      return next(new CustomError(404, "Form not found"));
    }

    const populatedForm = await FormModel.findById(updatedForm._id)
      .populate("createdBy updatedBy", "name email role isAdmin")
      .populate("fields.field");

    res.status(200).json({
      success: true,
      message: "Form updated successfully",
      form: populatedForm,
    });
  } catch (error) {
    next(
      error instanceof CustomError
        ? error
        : new CustomError(500, "Error updating form")
    );
  }
};

// ***************************************
// ********** Delete Form ****************
// ***************************************
export const deleteForm = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, body, query } = req;
    const { formId } = query as { formId?: string };
    const { formIds } = body;

    // Check permissions
    const permissionCheck = await checkPermission(userId, "custom-forms", 3);
    if (!permissionCheck) {
      throw new CustomError(403, "Unauthorized");
    }

    if (formIds && Array.isArray(formIds) && formIds.length > 0) {
      // Bulk delete
      const result = await FormModel.deleteMany({ _id: { $in: formIds } });
      if (result.deletedCount === 0) {
        throw new CustomError(404, "No forms found to delete");
      }
      res.status(200).json({
        message: `${result.deletedCount} form(s) deleted successfully`,
      });
    } else if (formId) {
      // Single delete
      const form = await FormModel.findByIdAndDelete(formId);
      if (!form) {
        throw new CustomError(404, "Form not found");
      }
      res.status(200).json({
        success: true,
        message: "Form deleted successfully",
      });
    } else {
      throw new CustomError(
        400,
        "Missing required parameter: formId or formIds"
      );
    }
  } catch (error) {
    next(new CustomError(500, "Error deleting form"));
  }
};
