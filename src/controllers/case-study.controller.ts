import mongoose, { isValidObjectId } from "mongoose";
import { Request, Response, NextFunction } from "express";
import Case_Study from "../models/case-study.model";
import { CustomError } from "../middlewares/error";
import { checkPermission } from "../helpers/authHelper";
import { validateInput } from "../utils/validateInput";
import slugify from "slugify";
import CaseStudy_Category from "../models/case-study-category.model";

// **************************************************************************
// ********** Create New Case Study  ****************************************
// **************************************************************************
export const createCaseStudy = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, body } = req;
    const { name, slug, category } = body;

    // Check permissions
    const permissionCheck = await checkPermission(userId, "case-studies", 0);
    if (!permissionCheck) return;

    // Validate user input
    if (!validateInput(req, res)) return;

    // Check if category exists
    const newSlug = slugify(slug || name, { lower: true });
    const existingCaseStudy = await Case_Study.findOne({
      $or: [
        { name: { $regex: new RegExp("^" + name + "$", "i") } },
        { slug: newSlug },
      ],
    });
    if (existingCaseStudy) {
      return next(
        new CustomError(
          400,
          existingCaseStudy.name.toLowerCase() === name.toLowerCase()
            ? "Case study with this name already exists"
            : "Case study with this slug already exists"
        )
      );
    }

    // Create new case study
    const newCaseStudy = {
      ...body,
      slug: slugify(slug || name, { lower: true }),
      category: category,
      createdBy: userId,
      updatedBy: userId,
    };

    const caseStudy = await Case_Study.create(newCaseStudy);

    // Update category if provided
    if (category) {
      await CaseStudy_Category.findByIdAndUpdate(
        category,
        { $addToSet: { caseStudies: caseStudy._id } },
        { new: true }
      );
    }

    // Populate references
    const populatedCaseStudy = await Case_Study.findById(caseStudy._id)
      .populate("category", "name slug")
      .populate("createdBy", "image name email")
      .populate("updatedBy", "image name email")
      .lean();

    res.status(201).json({
      success: true,
      message: "Case study created successfully",
      data: populatedCaseStudy,
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

// **************************************************************************
// ********** Retrieve Case Study *******************************************
// **************************************************************************
export const getCaseStudy = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { query } = req;
    const { id, slug, includeInactive } = query;

    const queryObject: CaseStudyQuery = {};

    if (id && !isValidObjectId(id)) {
      return next(new CustomError(400, "Invalid case study ID"));
    }
    if (slug && typeof slug !== "string") {
      return next(new CustomError(400, "Invalid slug format"));
    }

    if (id) {
      queryObject._id = id as string;
    } else if (slug) {
      queryObject.slug = slugify(slug as string, { lower: true });
    }

    if (includeInactive !== "true") {
      queryObject.status = "active";
    }

    let caseStudies;
    let message = "Case studies retrieved successfully";

    if (id || slug) {
      const caseStudy = await Case_Study.findOne(queryObject)
        .populate("category", "name slug")
        .populate("createdBy", "image name email")
        .populate("updatedBy", "image name email")
        .lean();

      if (!caseStudy) {
        return next(
          new CustomError(404, "Case study not found with provided ID or slug")
        );
      }

      caseStudies = caseStudy;
      message = "Case study retrieved successfully";
    } else {
      caseStudies = await Case_Study.find(queryObject)
        .populate("category", "name slug")
        .populate("createdBy", "image name email")
        .populate("updatedBy", "image name email")
        .lean();
    }

    res.status(200).json({
      success: true,
      message,
      data: id || slug ? caseStudies : caseStudies,
    });
  } catch (error: any) {
    console.error("Error retrieving case studies:", error.message);
    if (error.message.includes("required") || error.message.includes("empty")) {
      next(new CustomError(400, error.message));
    } else {
      next(new CustomError(500, error.message || "Internal server error"));
    }
  }
};

interface CaseStudyQuery {
  _id?: string;
  slug?: string;
  status?: string;
}

// **************************************************************************
// ********** Update Case Study by ID ***************************************
// **************************************************************************
export const updateCaseStudy = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, body } = req;
    const { id, name, slug, category, colorScheme, status, bodyData, seo } =
      body;

    // Check permissions
    const permissionCheck = await checkPermission(userId, "case-studies", 2);
    if (!permissionCheck) return;

    // Validate user input
    if (!validateInput(req, res)) return;

    // Check if case study exists
    const caseStudy = await Case_Study.findById(id);
    if (!caseStudy) {
      return next(new CustomError(404, "Case study not found"));
    }

    // Check for duplicate name or slug
    const newSlug = slugify(slug || name || caseStudy.name, { lower: true });
    if (name !== caseStudy.name || newSlug !== caseStudy.slug) {
      const existingCaseStudy = await CaseStudy_Category.findOne({
        $or: [
          {
            name: {
              $regex: new RegExp("^" + (name || caseStudy.name) + "$", "i"),
            },
          },
          { slug: newSlug },
        ],
        _id: { $ne: id },
      });
      if (existingCaseStudy) {
        return next(
          new CustomError(
            400,
            existingCaseStudy.name.toLowerCase() ===
            (name || caseStudy.name).toLowerCase()
              ? "Case study with this name already exists"
              : "Case study with this slug already exists"
          )
        );
      }
    }

    // Update category relationships
    if (category && category !== caseStudy.category?.toString()) {
      // Remove from old category
      if (caseStudy.category) {
        await CaseStudy_Category.findByIdAndUpdate(
          caseStudy.category,
          { $pull: { caseStudies: id } },
          { new: true }
        );
      }
      // Add to new category
      await CaseStudy_Category.findByIdAndUpdate(
        category,
        { $addToSet: { caseStudies: id } },
        { new: true }
      );
    }

    // Build update object
    const updateData = {
      ...(name && { name }),
      ...(slug && { slug: newSlug }),
      ...(category && { category }),
      ...(colorScheme && { colorScheme }),
      ...(status && { status }),
      ...(bodyData && { bodyData }),
      ...(seo && { seo }),
      updatedBy: userId
        ? new mongoose.Types.ObjectId(userId)
        : caseStudy.updatedBy,
    };

    // Update case study
    const updatedCaseStudy = await Case_Study.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("category", "name slug")
      .populate("createdBy", "image name email")
      .populate("updatedBy", "image name email")
      .lean();

    if (!updatedCaseStudy) {
      return next(new CustomError(404, "Failed to update case study"));
    }

    res.status(200).json({
      success: true,
      message: "Case study updated successfully",
      data: updatedCaseStudy,
    });
  } catch (error: any) {
    if (error.message.includes("required") || error.message.includes("empty")) {
      next(new CustomError(400, error.message));
    } else {
      next(new CustomError(500, error.message));
    }
  }
};

// **************************************************************************
// ********** Delete a Case Study by ID *************************************
// **************************************************************************
export const deleteCaseStudy = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, query } = req;
    const { id } = query;

    // Check permissions
    const permissionCheck = await checkPermission(userId, "case-studies", 3);
    if (!permissionCheck) return;

    // Check if case study exists
    const caseStudy = await Case_Study.findById(id);
    if (!caseStudy) {
      return next(new CustomError(404, "Case study not found"));
    }

    // Remove from category
    if (caseStudy.category && CaseStudy_Category) {
      await CaseStudy_Category.findByIdAndUpdate(
        caseStudy.category,
        { $pull: { caseStudies: id } },
        { new: true }
      );
    }

    // Delete case study
    await Case_Study.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Case study deleted successfully",
      data: null,
    });
  } catch (error: any) {
    if (error.message.includes("required") || error.message.includes("empty")) {
      next(new CustomError(400, error.message));
    } else {
      next(new CustomError(500, error.message));
    }
  }
};
