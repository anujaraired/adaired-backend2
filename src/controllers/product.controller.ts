import Product from "../models/product.model";
import { NextFunction, Request, Response } from "express";
import { CustomError } from "../middlewares/error";
import slugify from "slugify";
import { checkPermission } from "../helpers/authHelper";
import { ProductTypes } from "../types/productTypes";
import { Types } from "mongoose";
import Product_Category from "../models/product-category.model";
import { validateInput } from "../utils/validateInput";

// Helper function to check if a slug is unique
const isSlugUnique = async (slug: string, excludeProductId?: string) => {
  const query: { slug: string; _id?: { $ne: string } } = { slug };
  if (excludeProductId) {
    query._id = { $ne: excludeProductId };
  }
  const existingProduct = await Product.findOne(query);
  return !existingProduct;
};

// Helper function to fetch product by ID or slug
const fetchProduct = async (identifier: string) => {
  if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
    return await Product.findById(identifier);
  } else {
    return await Product.findOne({ slug: identifier });
  }
};

// Helper function to update product in categories
const updateProductInCategories = async (
  productId: Types.ObjectId,
  oldCategoryId: Types.ObjectId | null,
  oldSubCategoryIds: Types.ObjectId[] | null,
  newCategoryId: Types.ObjectId | null,
  newSubCategoryIds: Types.ObjectId[] | null
) => {
  const updates: Promise<any>[] = [];

  // Remove product from old category
  if (oldCategoryId) {
    updates.push(
      Product_Category.updateOne(
        { _id: oldCategoryId },
        { $pull: { products: productId } }
      )
    );
  }

  // Remove product from old subcategories
  if (oldSubCategoryIds && oldSubCategoryIds.length > 0) {
    updates.push(
      Product_Category.updateMany(
        { _id: { $in: oldSubCategoryIds } },
        { $pull: { products: productId } }
      )
    );
  }

  // Add product to new category
  if (newCategoryId) {
    updates.push(
      Product_Category.updateOne(
        { _id: newCategoryId },
        { $push: { products: productId } }
      )
    );
  }

  // Add product to new subcategories
  if (newSubCategoryIds && newSubCategoryIds.length > 0) {
    updates.push(
      Product_Category.updateMany(
        { _id: { $in: newSubCategoryIds } },
        { $push: { products: productId } }
      )
    );
  }

  // Execute all updates in parallel
  await Promise.all(updates);
};

// ***************************************
// ********** Create Product **************
// ***************************************
export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, body } = req;

    // Check Permission
    const permissionCheck = await checkPermission(userId, "products", 0);
    if (!permissionCheck) {
      throw new CustomError(403, "Permission denied");
    }

    // Validate user input
    if (!validateInput(req, res)) return;

    const { slug, name, subCategory, category } = body;

    // Ensure category is provided
    if (!category) {
      throw new CustomError(400, "Category is required");
    }

    // If slug is not provided, generate one from the name
    const slugToUse = slug
      ? slugify(slug, { lower: true })
      : slugify(name, { lower: true });

    // Check if the slug is unique
    if (!(await isSlugUnique(slugToUse))) {
      throw new CustomError(400, "Slug already in use");
    }

    // Handle subCategory as an array
    let subCategoryIds: Types.ObjectId[] = [];
    let parentCategories: Types.ObjectId[] = [];

    if (subCategory) {
      const subCategoryInput = Array.isArray(subCategory)
        ? subCategory
        : [subCategory];
      for (const subCatId of subCategoryInput) {
        const subcategory = await Product_Category.findById(subCatId);
        if (!subcategory) {
          throw new CustomError(404, `Subcategory ${subCatId} not found`);
        }
        const parentCat = await Product_Category.findById(
          subcategory.parentCategory
        );
        if (!parentCat) {
          throw new CustomError(
            404,
            `Parent category for subcategory ${subCatId} not found`
          );
        }
        subCategoryIds.push(new Types.ObjectId(subCatId));
        if (!parentCategories.some((id) => id.equals(parentCat._id))) {
          parentCategories.push(parentCat._id);
        }
      }

      // Validate provided category matches one of the parent categories
      const categoryId = new Types.ObjectId(category);
      if (!parentCategories.some((id) => id.equals(categoryId))) {
        throw new CustomError(
          400,
          "Category must be a parent of at least one subcategory"
        );
      }
    }

    // Create the product
    const newProduct: ProductTypes = {
      ...body,
      category,
      subCategory: subCategoryIds.map((id) => id.toString()),
      slug: slugToUse,
      createdBy: body.userId || userId,
    };

    const createdProduct = await Product.create(newProduct);

    // Update product-category relationships
    await updateProductInCategories(
      createdProduct._id,
      null,
      null,
      createdProduct.category,
      subCategoryIds.length > 0 ? subCategoryIds : null
    );

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: createdProduct,
    });
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};

// ***************************************
// ********** Read Product ****************
// ***************************************
export const readProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id, ...queryParams } = req.query;
  const filter: Record<string, any> = { ...queryParams };

  try {
    if (id) {
      const product = await Product.findById(id)
        .populate("createdBy category subCategory")
        .lean();
      if (!id) {
        throw new CustomError(404, "Product not found");
      }
      return res.status(200).json({
        success: true,
        message: "Product fetched successfully",
        data: product,
      });
    } else {
      const products = await Product.find(filter)
        .populate("createdBy category subCategory")
        .sort({ createdAt: -1 })
        .lean();
      return res.status(200).json({
        success: true,
        message: "Product fetched successfully",
        data: products,
      });
    }
  } catch (error: any) {
    return next(new CustomError(500, error.message));
  }
};
// ***************************************
// ********** Update Product **************
// ***************************************
export const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, body } = req;
    const { query } = req.query;

    // Check Permission
    const permissionCheck = await checkPermission(userId, "products", 2);
    if (!permissionCheck) {
      throw new CustomError(403, "Permission denied");
    }

    // Validate user input
    if (!validateInput(req, res)) return;

    const idString = query.toString();
    const product = await fetchProduct(idString);
    if (!product) {
      throw new CustomError(404, "Product not found!");
    }

    if (body.slug && body.slug !== product.slug) {
      const slugToUse = slugify(body.slug, { lower: true });
      if (!(await isSlugUnique(slugToUse, product._id.toString()))) {
        throw new CustomError(400, "Slug already in use");
      }
      body.slug = slugToUse;
    }

    // Handle subCategory array update
    let newSubCategoryIds: Types.ObjectId[] = [];
    let parentCategories: Types.ObjectId[] = [];

    if (body.subCategory) {
      const subCategoryInput = Array.isArray(body.subCategory)
        ? body.subCategory
        : [body.subCategory];

      for (const subCatId of subCategoryInput) {
        const subcategory = await Product_Category.findById(subCatId);
        if (!subcategory) {
          throw new CustomError(404, `Subcategory ${subCatId} not found`);
        }
        const parentCat = await Product_Category.findById(
          subcategory.parentCategory
        );
        if (!parentCat) {
          throw new CustomError(
            404,
            `Parent category for subcategory ${subCatId} not found`
          );
        }
        newSubCategoryIds.push(new Types.ObjectId(subCatId));
        if (!parentCategories.some((id) => id.equals(parentCat._id))) {
          parentCategories.push(parentCat._id);
        }
      }

      // If category is provided, ensure it matches one of the parent categories
      if (body.category) {
        const categoryId = new Types.ObjectId(body.category);
        if (!parentCategories.some((id) => id.equals(categoryId))) {
          throw new CustomError(
            400,
            "Provided category must be a parent of at least one subcategory"
          );
        }
      } else {
        // If no category provided, use existing or first parent category
        body.category = product.category;
      }
    }

    // Update product in categories if subCategory or category is changing
    const oldSubCategoryIds = product.subCategory
      ? (product.subCategory as unknown as Types.ObjectId[]).map(
          (id) => new Types.ObjectId(id)
        )
      : [];

    if (
      body.category?.toString() !== product.category?.toString() ||
      JSON.stringify(oldSubCategoryIds) !== JSON.stringify(newSubCategoryIds)
    ) {
      await updateProductInCategories(
        product._id,
        product.category,
        oldSubCategoryIds,
        body.category || product.category,
        newSubCategoryIds.length > 0 ? newSubCategoryIds : null
      );
      if (newSubCategoryIds.length > 0) {
        body.subCategory = newSubCategoryIds.map((id) => id.toString());
      }
    }

    // Update the product
    body.updatedBy = userId;
    const updatedProduct = await Product.findByIdAndUpdate(
      product._id,
      { $set: body },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};

// ***************************************
// ********** Delete Product **************
// ***************************************
export const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;
    const { query } = req.query;

    // Check Permission
    const permissionCheck = await checkPermission(userId, "products", 3);
    if (!permissionCheck) {
      throw new CustomError(403, "Permission denied");
    }

    const idString = query.toString();
    const product = await fetchProduct(idString);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Remove product from categories
    const oldSubCategoryIds = product.subCategory
      ? (product.subCategory as unknown as Types.ObjectId[]).map(
          (id) => new Types.ObjectId(id)
        )
      : [];

    await updateProductInCategories(
      product._id,
      product.category,
      oldSubCategoryIds,
      null,
      null
    );

    // Delete the product
    await Product.findByIdAndDelete(product._id);

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: null,
    });
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};

// ***************************************
// ********** Duplicate Product ***********
// ***************************************
export const duplicateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req;
    const { query } = req.query;

    // Check Permission
    const permissionCheck = await checkPermission(userId, "products", 0);
    if (!permissionCheck) {
      throw new CustomError(403, "Permission denied");
    }

    const idString = query.toString();
    const product = await fetchProduct(idString);
    if (!product) {
      throw new CustomError(404, "Product not found");
    }

    const subCategoryIds = product.subCategory
      ? (product.subCategory as unknown as Types.ObjectId[]).map(
          (id) => new Types.ObjectId(id)
        )
      : [];

    // Prepare the duplicated product data
    const duplicatedProductData = {
      ...product.toObject(),
      _id: new Types.ObjectId(),
      name: `${product.name} (Copy)`,
      slug: `${product.slug}-copy-${Date.now()}`,
      subCategory: subCategoryIds.map((id) => id.toString()),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      updatedBy: null as any,
    };

    // Create the duplicated product
    const duplicatedProduct = await Product.create(duplicatedProductData);

    await updateProductInCategories(
      duplicatedProduct._id,
      null,
      null,
      product.category,
      subCategoryIds.length > 0 ? subCategoryIds : null
    );

    res.status(201).json({
      success: true,
      message: "Product duplicated successfully",
      data: duplicatedProduct,
    });
  } catch (error: any) {
    next(new CustomError(500, error.message));
  }
};
