import mongoose from "mongoose";
import CaseStudy_Category from "../models/case-study-category.model";
import { CustomError } from "../middlewares/error";
import { checkPermission } from "../helpers/authHelper";
import { validateInput } from "../utils/validateInput";
import { NextFunction, Request, Response } from "express";
import slugify from "slugify";

// **************************************************************************
// ********** Create New Case Study Category *********************************
// **************************************************************************
export const newCaseStudyCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, body } = req;
    const { name, slug, canonicalLink, parentCategory } = body;

    // Check permissions
    const permissionCheck = await checkPermission(
      userId,
      "case-study-categories",
      0
    );
    if (!permissionCheck) return;

    // Validate user input
    if (!validateInput(req, res)) return;

    // Check for existing category by name or slug
    const existingCategory = await CaseStudy_Category.findOne({
      $or: [
        { name: { $regex: new RegExp("^" + name + "$", "i") } },
        {
          slug: slugify(slug || name, { lower: true }),
        },
      ],
    });

    if (existingCategory) {
      throw new CustomError(
        400,
        existingCategory.name === name
          ? "Case study category with this name already exists"
          : "Case study category with this slug already exists"
      );
    }

    // Create new case study category
    const newCategoryData = {
      ...body,
      slug: slugify(slug || name, { lower: true }),
      createdBy: userId,
      updatedBy: userId,
    };
    const newCategory = await CaseStudy_Category.create(newCategoryData);

    // Update parent's subcategories if applicable
    if (parentCategory) {
      await CaseStudy_Category.findByIdAndUpdate(parentCategory, {
        $addToSet: { subCategories: newCategory._id },
      });
    }

    res.status(201).json({
      message: "New Category created successfully",
      data: newCategory,
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
// ********** Retrieve Case Study Categories (single, all, or category-wise case studies) *****
// **************************************************************************
export const getCaseStudyCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, slug, status, parentCategory, includeCaseStudies } = req.query;

    // Build query
    const query: any = {};
    if (id) {
      query._id = id;
    } else if (slug) {
      query.slug = slug;
    }
    if (status) {
      query.status = status;
    }
    if (parentCategory) {
      query.parentCategory = parentCategory;
    }

    // Populate case studies if requested
    const populateOptions =
      includeCaseStudies === "true" ? [{ path: "caseStudies" }] : [];

    // Execute query
    const categories = await CaseStudy_Category.find(query)
      .populate(populateOptions)
      .populate({
        path: "parentCategory",
        select: "name slug",
      })
      .lean();

    res.status(200).json({
      message: "Categories retrieved successfully",
      data: categories,
    });
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};

// **************************************************************************
// ********** Update a Case Study Category by ID (query parameter) ***********
// **************************************************************************
export const updateCaseStudyCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, query, body } = req;
    const { id } = query;

    // Check permissions
    const permissionCheck = await checkPermission(
      userId,
      "case-study-categories",
      2
    );
    if (!permissionCheck) return;

    // Validate input
    if (!validateInput(req, res)) return;

    // Check if category exists
    const category = await CaseStudy_Category.findById(id);
    if (!category) {
      throw new CustomError(404, "Case study category not found");
    }

    // Check for duplicate name or slug (excluding current category)
    if (body.name || body.slug) {
      const existingCategory = await CaseStudy_Category.findOne({
        $or: [
          {
            name: {
              $regex: new RegExp("^" + body.name + "$", "i"),
            },
          },
          {
            slug: slugify(body.slug || body.name, {
              lower: true,
            }),
          },
        ],
        _id: { $ne: id },
      });
      if (existingCategory) {
        throw new CustomError(
          400,
          existingCategory.name === body.name
            ? "Case study category with this name already exists"
            : "Case study category with this slug already exists"
        );
      }
    }

    // Update parentCategory's subCategories if changed
    if (
      body.parentCategory &&
      body.parentCategory !== category.parentCategory?.toString()
    ) {
      // Remove from old parent's subCategories
      if (category.parentCategory) {
        await CaseStudy_Category.findByIdAndUpdate(category.parentCategory, {
          $pull: { subCategories: category._id },
        });
      }
      // Add to new parent's subCategories
      await CaseStudy_Category.findByIdAndUpdate(body.parentCategory, {
        $addToSet: { subCategories: category._id },
      });
    }

    // Update case study category
    const updatedCategory = await CaseStudy_Category.findByIdAndUpdate(
      id,
      {
        ...body,
        updatedBy: userId,
        slug: body.slug && slugify(body.slug, { lower: true }),
      },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      throw new CustomError(404, "Case study category not found");
    }

    res.status(200).json({
      message: "Category updated successfully",
      data: updatedCategory,
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
// ********** Delete a Case Study Category by ID (query parameter) ***********
// **************************************************************************
export const deleteCaseStudyCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, query } = req;
    const { id } = query;

    // Check permissions
    const permissionCheck = await checkPermission(
      userId,
      "case-study-categories",
      3
    );
    if (!permissionCheck) return;

    // Validate ID
    if (!id || !mongoose.isValidObjectId(id)) {
      throw new CustomError(400, "Valid case study category ID is required");
    }

    // Check if category exists
    const category = await CaseStudy_Category.findById(id);
    if (!category) {
      throw new CustomError(404, "Case study category not found");
    }

    // Check if category has subcategories
    if (category.subCategories.length > 0) {
      throw new CustomError(
        400,
        "Cannot delete case study category with subcategories. Delete subcategories first."
      );
    }

    // Remove from parent's subCategories if applicable
    if (category.parentCategory) {
      await CaseStudy_Category.findByIdAndUpdate(category.parentCategory, {
        $pull: { subCategories: category._id },
      });
    }

    // Delete case study category
    await CaseStudy_Category.findByIdAndDelete(id);

    res.status(200).json({
      message: "Category deleted successfully",
      data: null,
    });
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};
