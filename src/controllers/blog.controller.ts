import Blog from "../models/blog.model";
import e, { NextFunction, Request, Response } from "express";
import { CustomError } from "../middlewares/error";
import { checkPermission } from "../helpers/authHelper";
import slugify from "slugify";
import { validateInput } from "../utils/validateInput";
import Blog_Category from "../models/blog-category.model";
import sanitizeHtml from "sanitize-html";
import { hasSeoFields } from "../models/seo-schema.model";

// ************************************************************************** //
// ********** Create New Blog *********************************************** //
// ************************************************************************** //
const newBlog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, body } = req;
    const { postTitle, slug, category, postDescription, scheduledPublishDate } =
      body;

    // Check permissions
    const permissionCheck = await checkPermission(userId, "blogs", 0);
    if (!permissionCheck) {
      throw new CustomError(403, "Insufficient permissions to create blog");
    }

    // Validate user input
    if (!validateInput(req, res)) {
      return;
    }

    // Sanitize inputs
    const sanitizedPostTitle = sanitizeHtml(postTitle);
    const sanitizedPostDescription = sanitizeHtml(postDescription);

    // Check if category exists (if provided)
    if (category) {
      const categoryExists = await Blog_Category.findById(category);
      if (!categoryExists) {
        throw new CustomError(400, "Invalid category ID");
      }
    }

    // Validate scheduledPublishDate if status is "scheduled"
    if (body.status === "scheduled" && !scheduledPublishDate) {
      throw new CustomError(
        400,
        "Scheduled publish date is required when status is set to 'scheduled'"
      );
    }

    // Validate scheduledPublishDate if provided
    if (scheduledPublishDate) {
      const publishDate = new Date(scheduledPublishDate);
      if (isNaN(publishDate.getTime()) || publishDate <= new Date()) {
        throw new CustomError(
          400,
          "Scheduled publish date must be a valid future date"
        );
      }
    }

    // Check for existing blog by title or slug
    const generatedSlug = slugify(slug || sanitizedPostTitle, { lower: true });
    const existingBlog = await Blog.findOne({
      $or: [
        { postTitle: { $regex: new RegExp(`^${sanitizedPostTitle}$`, "i") } },
        { slug: generatedSlug },
      ],
    });

    if (existingBlog) {
      throw new CustomError(
        400,
        existingBlog.postTitle.toLowerCase() ===
        sanitizedPostTitle.toLowerCase()
          ? "Blog with this title already exists"
          : "Blog with this slug already exists"
      );
    }

    // Create new blog
    const newBlogData = {
      ...body,
      postTitle: sanitizedPostTitle,
      postDescription: sanitizedPostDescription,
      slug: generatedSlug,
      blogAuthor: userId,
      updatedBy: userId,
      category: category || null,
      status: scheduledPublishDate ? "scheduled" : body.status || "draft",
      scheduledPublishDate: scheduledPublishDate
        ? new Date(scheduledPublishDate)
        : null,
    };

    const newBlog = await Blog.create(newBlogData);

    // Update blog category if provided
    if (category) {
      await Blog_Category.findByIdAndUpdate(
        category,
        { $push: { blogs: newBlog._id } },
        { new: true }
      );
    }

    res.status(201).json({
      success: true,
      message: "Blog created successfully",
      data: newBlog,
    });
  } catch (error: any) {
    if (error.message.includes("required") || error.message.includes("empty")) {
      next(new CustomError(400, error.message));
    } else {
      next(new CustomError(error.status || 500, error.message));
    }
  }
};

// ************************************************************************** //
// ********** Retrieve Blog (single, all, or category-wise blogs) *********** //
// ************************************************************************** //
const readBlog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, slug, category, status, limit, skip = 0 } = req.query;

    // Build query with type safety
    const query: any = {};
    if (id && typeof id === "string") {
      query._id = id;
    } else if (slug && typeof slug === "string") {
      query.slug = slug;
    } else if (status && typeof status === "string") {
      query.status = status;
    }

    if (category && typeof category === "string") {
      const categoryExists = await Blog_Category.findById(category);
      if (!categoryExists) {
        throw new CustomError(400, "Invalid category ID");
      }
      query.category = category;
    }

    // Convert limit and skip to numbers
    const numericLimit = limit ? parseInt(limit as string) : undefined;
    const numericSkip = parseInt(skip as string);

    // Execute query with pagination
    const queryBuilder = Blog.find(query)
      .populate({
        path: "blogAuthor",
        select: "-__v -cart -wishlist -orderHistory",
      })
      .populate({
        path: "category",
        select: "name image",
      })
      .sort({ createdAt: -1 })
      .lean();

    // Apply limit if provided
    if (numericLimit) {
      queryBuilder.limit(numericLimit);
    }

    // Always apply skip
    queryBuilder.skip(numericSkip);

    const blogs = await queryBuilder.exec();

    res.status(200).json({
      success: true,
      message: "Blogs fetched successfully",
      data: blogs,
    });
  } catch (error: any) {
    next(new CustomError(error.status || 500, error.message));
  }
};

// ************************************************************************** //
// ********** Update a Blog ************************************************* //
// ************************************************************************** //
const updateBlog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, query, body } = req;
    const { id } = query;

    // Check permissions
    const permissionCheck = await checkPermission(userId, "blogs", 2);
    if (!permissionCheck) {
      throw new CustomError(403, "Insufficient permissions to update blog");
    }

    // Validate input
    if (!validateInput(req, res)) {
      return;
    }

    // Check if blog exists
    const blog = await Blog.findById(id);
    if (!blog) {
      throw new CustomError(404, "Blog not found");
    }

    // Sanitize inputs
    const sanitizedPostTitle = body.postTitle
      ? sanitizeHtml(body.postTitle)
      : blog.postTitle;
    const sanitizedPostDescription = body.postDescription
      ? sanitizeHtml(body.postDescription)
      : blog.postDescription;

    // Check if category exists (if provided)
    if (body.category) {
      const categoryExists = await Blog_Category.findById(body.category);
      if (!categoryExists) {
        throw new CustomError(400, "Invalid category ID");
      }
    }

    // Validate scheduledPublishDate if status is "scheduled"
    if (body.status === "scheduled" && !body.scheduledPublishDate) {
      throw new CustomError(
        400,
        "Scheduled publish date is required when status is set to 'scheduled'"
      );
    }

    // Validate scheduledPublishDate if provided
    if (body.scheduledPublishDate) {
      const publishDate = new Date(body.scheduledPublishDate);
      if (isNaN(publishDate.getTime()) || publishDate <= new Date()) {
        throw new CustomError(
          400,
          "Scheduled publish date must be a valid future date"
        );
      }
    }

    // Check for duplicate title or slug (excluding current blog)
    if (body.postTitle || body.slug) {
      const generatedSlug = slugify(body.slug || sanitizedPostTitle, {
        lower: true,
      });
      const existingBlog = await Blog.findOne({
        $or: [
          {
            postTitle: {
              $regex: new RegExp(`^${sanitizedPostTitle}$`, "i"),
            },
          },
          { slug: generatedSlug },
        ],
        _id: { $ne: id },
      });

      if (existingBlog) {
        throw new CustomError(
          400,
          existingBlog.postTitle.toLowerCase() ===
          sanitizedPostTitle.toLowerCase()
            ? "Blog with this title already exists"
            : "Blog with this slug already exists"
        );
      }
      body.slug = generatedSlug;
    }

    // Update category if changed
    if (body.category && body.category !== blog.category?.toString()) {
      // Remove blog from old category
      if (blog.category) {
        await Blog_Category.findByIdAndUpdate(
          blog.category,
          { $pull: { blogs: blog._id } },
          { new: true }
        );
      }

      // Add blog to new category
      await Blog_Category.findByIdAndUpdate(
        body.category,
        { $push: { blogs: blog._id } },
        { new: true }
      );
    }

    // Update seo.lastModified if SEO fields are present
    if (hasSeoFields(body)) {
      body.seo = {
        ...body.seo,
        lastModified: Date.now(),
      };
    }

    // Update blog
    const updatedBlog = await Blog.findByIdAndUpdate(
      id,
      {
        ...body,
        postTitle: sanitizedPostTitle,
        postDescription: sanitizedPostDescription,
        updatedBy: userId,
        status: body.scheduledPublishDate
          ? "scheduled"
          : body.status || blog.status,
        scheduledPublishDate: body.scheduledPublishDate
          ? new Date(body.scheduledPublishDate)
          : blog.scheduledPublishDate,
      },
      { new: true }
    );

    if (!updatedBlog) {
      throw new CustomError(404, "Blog not found");
    }

    res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: updatedBlog,
    });
  } catch (error: any) {
    if (error.message.includes("required") || error.message.includes("empty")) {
      next(new CustomError(400, error.message));
    } else {
      next(new CustomError(error.status || 500, error.message));
    }
  }
};

// ************************************************************************** //
// ********** Delete a Blog ************************************************* //
// ************************************************************************** //
const deleteBlog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, query } = req;
    const { id } = query;

    // Check permissions
    const permissionCheck = await checkPermission(userId, "blogs", 3);
    if (!permissionCheck) {
      throw new CustomError(403, "Insufficient permissions to delete blog");
    }

    // Check if blog exists and delete it
    const blog = await Blog.findByIdAndDelete(id);
    if (!blog) {
      throw new CustomError(404, "Blog not found");
    }

    // Remove blog from its category if assigned
    if (blog.category) {
      await Blog_Category.findByIdAndUpdate(
        blog.category,
        { $pull: { blogs: blog._id } },
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
      data: null,
    });
  } catch (error: any) {
    next(new CustomError(error.status || 500, error.message));
  }
};

export { newBlog, readBlog, updateBlog, deleteBlog };
