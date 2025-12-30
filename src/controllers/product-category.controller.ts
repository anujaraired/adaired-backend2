import Product_Category from "../models/product-category.model";
import { NextFunction, Request, Response } from "express";
import { CustomError } from "../middlewares/error";
import slugify from "slugify";
import { checkPermission } from "../helpers/authHelper";
import { validateInput } from "../utils/validateInput";
import { Types } from "mongoose";

// **************************************************************************
// ********** Create New Category *******************************************
// **************************************************************************
export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, body } = req;
    const { name, slug, parentCategory } = body;

    // Check Permission
    const permissionCheck = await checkPermission(userId, "products", 0);
    if (!permissionCheck) return;

    // Validate user input
    if (!validateInput(req, res)) return;

    // Check for existing category by name or slug
    const existingCategory = await Product_Category.findOne({
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
    const newCategory = await Product_Category.create(newCategoryData);

    // Update parent's subcategories if applicable
    if (parentCategory) {
      await Product_Category.findByIdAndUpdate(parentCategory, {
        $addToSet: { subCategories: newCategory._id },
      });
    }

    // Populate parent category for response
    const newCategoryLean = await Product_Category.findById(newCategory._id)
      .populate("parentCategory", "name slug")
      .lean();

    res.status(201).json({
      success: true,
      message: "Category created successfully",
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
// ********** Retrieve categories (single, all, or category-wise) ***********
// **************************************************************************
export const readCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      id,
      slug,
      status,
      parentCategory,
      includeProducts,
      includeSubcategoryProducts,
      includeSubCategories,
    } = req.query;

    // If no ID or slug is provided → return all categories
    if (!id && !slug) {
      const query: any = {};
      if (status) query.status = status;
      if (parentCategory) query.parentCategory = parentCategory;

      const categories = await Product_Category.find(query)
        .populate("parentCategory", "name slug")
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({
        message: "All categories",
        data: categories,
      });
    }

    // Identifier (slug or id)
    const identifier = id || slug;
    const pipeline: any[] = [];

    // Match by ID or slug
    if (identifier && typeof identifier === "string") {
      if (/^[0-9a-fA-F]{24}$/.test(identifier)) {
        pipeline.push({
          $match: { _id: new Types.ObjectId(identifier) },
        });
      } else {
        pipeline.push({
          $match: { slug: identifier },
        });
      }
    }

    // Populate subCategories
    if (includeSubCategories === "true") {
      pipeline.push({
        $lookup: {
          from: "product_categories",
          localField: "subCategories",
          foreignField: "_id",
          as: "subCategories",
        },
      });

      // If requested, populate products inside subCategories
      if (includeSubcategoryProducts === "true") {
        pipeline.push(
          { $unwind: "$subCategories" },
          {
            $lookup: {
              from: "products",
              localField: "subCategories.products",
              foreignField: "_id",
              as: "subCategories.products",
            },
          },
          {
            $group: {
              _id: "$_id",
              subCategories: { $push: "$subCategories" },
              root: { $first: "$$ROOT" },
            },
          },
          {
            $replaceRoot: {
              newRoot: {
                $mergeObjects: ["$root", { subCategories: "$subCategories" }],
              },
            },
          }
        );
      }
    }

    // Populate products of this category
    if (includeProducts === "true") {
      pipeline.push({
        $lookup: {
          from: "products",
          localField: "products",
          foreignField: "_id",
          as: "products",
        },
      });
    }

    // Populate parent category
    pipeline.push({
      $lookup: {
        from: "product_categories",
        localField: "parentCategory",
        foreignField: "_id",
        as: "parentCategory",
      },
    });

    pipeline.push({
      $unwind: {
        path: "$parentCategory",
        preserveNullAndEmptyArrays: true,
      },
    });

    // Execute query
    const result = await Product_Category.aggregate(pipeline);

    if (!result || result.length === 0) {
      return next(new CustomError(404, "Category not found!"));
    }

    return res.status(200).json({
      message: "Categories retrieved successfully",
      data: result[0],
    });
  } catch (error: any) {
    return next(new CustomError(500, error.message));
  }
};

// **************************************************************************
// ********** Update a category by ID (query parameter) *********************
// **************************************************************************
export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, query, body } = req;
    const { id } = query;

    // Check Permission
    const permissionCheck = await checkPermission(userId, "products", 2);
    if (!permissionCheck) return;

    // Validate input
    if (!validateInput(req, res)) return;

    // Check if category exists
    const category = await Product_Category.findById(id);
    if (!category) {
      throw new CustomError(404, "Category not found");
    }

    // Check if the category exists
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Check for duplicate name or slug (excluding current category)
    if (body.name || body.slug) {
      const existingCategory = await Product_Category.findOne({
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

    // If parent category is changing, update the old and new categories
    if (
      body.parentCategory &&
      body.parentCategory !== category.parentCategory?.toString()
    ) {
      // Remove from old parent's subCategories
      if (category.parentCategory) {
        await Product_Category.findByIdAndUpdate(
          category.parentCategory,
          {
            $pull: { subCategories: category._id },
          },
          { new: true }
        );
      }

      // Add to new parent's subCategories
      await Product_Category.findByIdAndUpdate(body.parentCategory, {
        $addToSet: { subCategories: category._id },
      });
    }

    body.updatedBy = userId;

    // Update category
    const updatedCategory = await Product_Category.findByIdAndUpdate(
      id,
      {
        ...body,
        updatedBy: userId,
        slug: body.slug && slugify(body.slug, { lower: true }),
      },
      { new: true, runValidators: true }
    ).populate("parentCategory", "name slug");

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
export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, query } = req;
    const { id } = query;

    // Check permissions
    const permissionCheck = await checkPermission(userId, "products", 3);
    if (!permissionCheck) return;

    // Check if category exists
    const category = await Product_Category.findById(id);
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
      await Product_Category.findByIdAndUpdate(category.parentCategory, {
        $pull: { subCategories: category._id },
      });
    }

    // Delete category
    await Product_Category.findByIdAndDelete(id);

    res.status(200).json({
      message: "Category deleted successfully",
      data: null,
    });
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};
