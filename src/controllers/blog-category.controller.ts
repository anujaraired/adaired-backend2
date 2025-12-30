import mongoose from "mongoose";
import Blog_Category from "../models/blog-category.model";
import { CustomError } from "../middlewares/error";
import { checkPermission } from "../helpers/authHelper";
import { validateInput } from "../utils/validateInput";
import { NextFunction, Request, Response } from "express";
import slugify from "slugify";

// **************************************************************************
// ********** Create New Category *******************************************
// **************************************************************************
export const newBlogCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, body } = req;
    const { name, slug, parentCategory } = body;

    // Check permissions
    const permissionCheck = await checkPermission(userId, "blogs", 0);
    if (!permissionCheck) return;

    // Validate user input
    if (!validateInput(req, res)) return;

    // Check for existing category by name or slug
    const existingCategory = await Blog_Category.findOne({
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
          ? "Category with this name already exists"
          : "Category with this slug already exists"
      );
    }

    // Create new category
    const newCategoryData = {
      ...body,
      slug: slugify(slug || name, { lower: true }),
      createdBy: userId,
      updatedBy: userId,
    };

    let newCategory = await Blog_Category.create(newCategoryData);

    // Update parent's subcategories if applicable
    if (parentCategory) {
      await Blog_Category.findByIdAndUpdate(parentCategory, {
        $addToSet: { subCategories: newCategory._id },
      });
    }

    // Populate parent category for response
    const newCategoryLean = await Blog_Category
      .findById(newCategory._id)
      .populate("parentCategory", "name slug")
      .lean();
      

    res.status(201).json({
      message: "New blog category created successfully",
      data: newCategoryLean,
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
// ********** Retrieve categories (single, all, or category-wise blogs) *****
// **************************************************************************
export const getBlogCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, slug, status, parentCategory, includeBlogs } = req.query;

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

    // Populate blogs if requested
    const populateOptions = includeBlogs === "true" ? [{ path: "blogs" }] : [];

    // Execute query
    const categories = await Blog_Category.find(query)
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
// ********** Update a category by ID (query parameter) *********************
// **************************************************************************
export const updateBlogCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, query, body } = req;
    const { id } = query;

    // Check permissions
    const permissionCheck = await checkPermission(userId, "blog", 2);
    if (!permissionCheck) return;

    // Validate input
    if (!validateInput(req, res)) return;

    // Check if category exists
    const category = await Blog_Category.findById(id);
    if (!category) {
      throw new CustomError(404, "Category not found");
    }

    // Check for duplicate name or slug (excluding current category)
    if (body.name || body.slug) {
      const existingCategory = await Blog_Category.findOne({
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
            ? "Category with this name already exists"
            : "Category with this slug already exists"
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
        await Blog_Category.findByIdAndUpdate(category.parentCategory, {
          $pull: { subCategories: category._id },
        });
      }
      // Add to new parent's subCategories
      await Blog_Category.findByIdAndUpdate(body.parentCategory, {
        $addToSet: { subCategories: category._id },
      });
    }

    // Update category
    const updatedCategory = await Blog_Category.findByIdAndUpdate(
      id,
      {
        ...body,
        updatedBy: userId,
        slug: body.slug && slugify(body.slug, { lower: true }),
      },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      throw new CustomError(404, "Category not found");
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
// ********** Delete a category by ID (query parameter) *********************
// **************************************************************************
export const deleteBlogCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, query } = req;
    const { id } = query;

    // Check permissions
    const permissionCheck = await checkPermission(userId, "blog-categories", 3);
    if (!permissionCheck) return;

    // Check if category exists
    const category = await Blog_Category.findById(id);
    if (!category) {
      throw new CustomError(404, "Category not found");
    }

    // Check if category has subcategories
    if (category.subCategories.length > 0) {
      throw new CustomError(
        400,
        "Cannot delete category with subcategories. Delete subcategories first."
      );
    }

    // Remove from parent's subCategories if applicable
    if (category.parentCategory) {
      await Blog_Category.findByIdAndUpdate(category.parentCategory, {
        $pull: { subCategories: category._id },
      });
    }

    // Delete category
    await Blog_Category.findByIdAndDelete(id);

    res.status(200).json({
      message: "Category deleted successfully",
      data: null,
    });
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};
