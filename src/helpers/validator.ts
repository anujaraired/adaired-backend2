import mongoose, { Types } from "mongoose";
import { check, body, param, query } from "express-validator";
import { TicketPriority, TicketStatus } from "../types/ticket.types";

// ********** User and Authentication ***********
export const validateRegister = [
  check("name", "Name is required").isString().trim(),
  check("email", "Email is required")
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail({
      gmail_remove_dots: true,
    })
    .trim(),
  check("password")
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage(
      "Password must be at least 8 characters long and contain at least 1 lowercase letter, 1 uppercase letter, 1 number, and 1 special character"
    )
    .optional(),
  check("contact")
    .optional()
    .custom((value) => {
      if (!value) return true;
      const phonePattern = /^\+?[1-9]\d{6,14}$/;
      return phonePattern.test(value);
    })
    .withMessage("Contact must be a valid phone number"),
  check("status").optional(),
];

export const validateLogin = [
  body().custom((value, { req }) => {
    if (!req.body.googleId) {
      if (!req.body.identifier) {
        throw new Error("Email or Username is required");
      }
      if (!req.body.password) {
        throw new Error("Password is required");
      }
    }
    return true;
  }),
  check("identifier")
    .optional()
    .custom((value) => {
      if (value) {
        const isEmail = /\S+@\S+\.\S+/.test(value);
        const isUsername = /^[a-zA-Z0-9._-]{3,20}$/.test(value);
        if (!isEmail && !isUsername) {
          throw new Error("Identifier must be a valid email or username");
        }
      }
      return true;
    }),
  check("rememberMe").optional().isBoolean(),
];

// ********** Roles **********
export const validateRole = [
  check("name", "Role name is required").notEmpty().isString().trim(),
  check("description").optional().isString().trim(),
  check("status").optional().isBoolean().default(true),
  check("permissions").isArray().optional(),
];

export const validateUpdateRole = [
  check("name", "Role name is required")
    .optional()
    .notEmpty()
    .isString()
    .trim(),
  check("description").optional().isString().trim(),
  check("status").optional().isBoolean(),
  check("permissions").optional().isArray(),
];

export const validateRoleId = [
  check("roleId", "Role ID is required")
    .optional()
    .notEmpty()
    .isMongoId()
    .withMessage("Please enter a valid role ID"),
];

export const validatePermissionModuleCreate = [
  check("name", "Module name is required").notEmpty().isString().trim(),
  check("value", "Module value is required").notEmpty().isString().trim(),
  check("status").optional().isBoolean().default(true),
];
export const validatePermissionModuleUpdate = [
  check("name").optional().isString().trim(),
  check("value").optional().isString().trim(),
  check("status").optional().isBoolean().default(true),
];

// ***********************************************************************************************************************************************************
// ******************************************************************* Blogs *********************************************************************************
// ***********************************************************************************************************************************************************

export const validateBlog = [
  check("seo.metaTitle", "SEO meta title is required")
    .notEmpty()
    .isString()
    .trim(),
  check("seo.metaDescription", "SEO meta description is required")
    .notEmpty()
    .isString()
    .trim(),
  check("seo.canonicalLink", "SEO canonical link is required")
    .notEmpty()
    .isString()
    .trim()
    .withMessage("Canonical link must be a valid string (URL or slug)"),
  check("seo.focusKeyword", "SEO focus keyword is required")
    .notEmpty()
    .isString()
    .trim(),
  check("seo.keywords", "SEO keywords must be an array of strings")
    .optional()
    .isArray()
    .custom((value: string[]) => {
      return value.every(
        (keyword) => typeof keyword === "string" && keyword.trim().length > 0
      );
    })
    .withMessage("Each keyword must be a non-empty string"),
  check("seo.openGraph.title", "Open Graph title must be a string")
    .optional()
    .isString()
    .trim(),
  check("seo.openGraph.description", "Open Graph description must be a string")
    .optional()
    .isString()
    .trim(),
  check("seo.openGraph.image")
    .if((value) => value !== undefined && value !== null && value !== "")
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("Open Graph image must be a valid URL")
    .trim(),
  check("seo.openGraph.type", "Open Graph type must be a string")
    .optional()
    .isString()
    .trim(),
  check("seo.openGraph.url", "Open Graph URL must be a valid URL")
    .optional()
    .trim(),
  check("seo.openGraph.siteName", "Open Graph site name must be a string")
    .optional()
    .isString()
    .trim(),
  check("seo.twitterCard.cardType", "Twitter card type must be a string")
    .optional()
    .isString()
    .trim(),
  check("seo.twitterCard.site", "Twitter card site must be a string")
    .optional()
    .isString()
    .trim(),
  check("seo.twitterCard.creator", "Twitter card creator must be a string")
    .optional()
    .isString()
    .trim(),
  check("seo.twitterCard.title", "Twitter card title must be a string")
    .optional()
    .isString()
    .trim(),
  check(
    "seo.twitterCard.description",
    "Twitter card description must be a string"
  )
    .optional()
    .isString()
    .trim(),
  check("seo.twitterCard.image", "Twitter card image must be a valid URL")
    .if((value) => value !== undefined && value !== null && value !== "")
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .trim(),
  check("seo.robotsText", "SEO robots text is required")
    .notEmpty()
    .isString()
    .trim(),
  check("seo.schemaOrg", "SEO schema.org must be a valid string")
    .optional()
    .isString()
    .trim(),
  check("seo.bodyScript", "SEO body script must be a string")
    .optional()
    .isString()
    .trim(),
  check("seo.headerScript", "SEO header script must be a string")
    .optional()
    .isString()
    .trim(),
  check("seo.footerScript", "SEO footer script must be a string")
    .optional()
    .isString()
    .trim(),
  check("seo.priority", "SEO priority must be a number between 0 and 1")
    .optional()
    .isFloat({ min: 0, max: 1 }),
  check("seo.changeFrequency", "SEO change frequency must be valid")
    .optional()
    .isIn([
      "always",
      "hourly",
      "daily",
      "weekly",
      "monthly",
      "yearly",
      "never",
    ]),
  check("seo.redirect.type", "SEO redirect type must be '301', '302', or null")
    .optional()
    .isIn(["301", "302", null]),
  check("seo.redirect.url", "SEO redirect URL must be a valid URL")
    .if((value) => value !== undefined && value !== null && value !== "")
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .trim(),

  // Blog Fields
  check("category", "Category must be a valid MongoDB ID")
    .optional()
    .isMongoId(),
  check("featuredImage", "Featured image must be a valid URL")
    .notEmpty()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .trim(),
  check("postTitle", "Post title is required").notEmpty().isString().trim(),
  check("postDescription", "Post description is required")
    .notEmpty()
    .isString(),
  check("slug", "Slug must be a valid string").optional().isString().trim(),
  check("tags", "Tags must be an array of strings")
    .optional()
    .isArray()
    .custom((value: string[]) => {
      return value.every(
        (tag) => typeof tag === "string" && tag.trim().length > 0
      );
    })
    .withMessage("Each tag must be a non-empty string"),
  check("blogAuthor", "Blog author must be a valid MongoDB ID")
    .optional()
    .isMongoId(),
  check("status", "Status must be either 'publish' , 'draft' or 'scheduled")
    .optional()
    .isIn(["publish", "draft", "scheduled"]),
];

export const validateUpdateBlog = [
  check("seo.metaTitle", "SEO meta title must be a string")
    .optional()
    .isString()
    .trim(),
  check("seo.metaDescription", "SEO meta description must be a string")
    .optional()
    .isString()
    .trim(),
  check("seo.canonicalLink", "SEO canonical link must be a valid string")
    .optional()
    .isString()
    .trim()
    .withMessage("Canonical link must be a valid string (URL or slug)"),
  check("seo.focusKeyword", "SEO focus keyword must be a string")
    .optional()
    .isString()
    .trim(),
  check("seo.keywords", "SEO keywords must be an array of strings")
    .optional()
    .isArray()
    .custom((value: string[]) => {
      return value.every(
        (keyword) => typeof keyword === "string" && keyword.trim().length > 0
      );
    })
    .withMessage("Each keyword must be a non-empty string"),
  check("seo.openGraph.title", "Open Graph title must be a string")
    .optional()
    .isString()
    .trim(),
  check("seo.openGraph.description", "Open Graph description must be a string")
    .optional()
    .isString()
    .trim(),
  check("seo.openGraph.image")
    .if((value) => value !== undefined && value !== null && value !== "")
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("Open Graph image must be a valid URL")
    .trim(),
  check("seo.openGraph.type", "Open Graph type must be a string")
    .optional()
    .isString()
    .trim(),
  check("seo.openGraph.url", "Open Graph URL must be a valid URL")
    .if((value) => value !== undefined && value !== null && value !== "")
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .trim(),
  check("seo.openGraph.siteName", "Open Graph site name must be a string")
    .optional()
    .isString()
    .trim(),
  check("seo.twitterCard.cardType", "Twitter card type must be a string")
    .optional()
    .isString()
    .trim(),
  check("seo.twitterCard.site", "Twitter card site must be a string")
    .optional()
    .isString()
    .trim(),
  check("seo.twitterCard.creator", "Twitter card creator must be a string")
    .optional()
    .isString()
    .trim(),
  check("seo.twitterCard.title", "Twitter card title must be a string")
    .optional()
    .isString()
    .trim(),
  check(
    "seo.twitterCard.description",
    "Twitter card description must be a string"
  )
    .optional()
    .isString()
    .trim(),
  check("seo.twitterCard.image", "Twitter card image must be a valid URL")
    .if((value) => value !== undefined && value !== null && value !== "")
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .trim(),
  check("seo.robotsText", "SEO robots text must be a string")
    .optional()
    .isString()
    .trim(),
  check("seo.schemaOrg", "SEO schema.org must be a valid string")
    .optional()
    .isString()
    .trim(),
  check("seo.bodyScript", "SEO body script must be a string")
    .optional()
    .isString()
    .trim(),
  check("seo.headerScript", "SEO header script must be a string")
    .optional()
    .isString()
    .trim(),
  check("seo.footerScript", "SEO footer script must be a string")
    .optional()
    .isString()
    .trim(),
  check("seo.priority", "SEO priority must be a number between 0 and 1")
    .optional()
    .isFloat({ min: 0, max: 1 }),
  check("seo.changeFrequency", "SEO change frequency must be valid")
    .optional()
    .isIn([
      "always",
      "hourly",
      "daily",
      "weekly",
      "monthly",
      "yearly",
      "never",
    ]),
  check("seo.redirect.type", "SEO redirect type must be '301', '302', or null")
    .optional()
    .isIn(["301", "302", null]),
  check("seo.redirect.url", "SEO redirect URL must be a valid URL")
    .if((value) => value !== undefined && value !== null && value !== "")
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .trim(),

  // Blog Fields
  check("category", "Category must be a valid MongoDB ID")
    .optional()
    .isMongoId(),
  check("featuredImage", "Featured image must be a valid URL")
    .optional()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .trim(),
  check("postTitle", "Post title must be a string")
    .optional()
    .isString()
    .trim(),
  check("postDescription", "Post description must be a string")
    .optional()
    .isString(),
  check("slug", "Slug must be a valid string").optional().isString().trim(),
  check("tags", "Tags must be an array of strings")
    .optional()
    .isArray()
    .custom((value: string[]) => {
      return value.every(
        (tag) => typeof tag === "string" && tag.trim().length > 0
      );
    })
    .withMessage("Each tag must be a non-empty string"),
  check("blogAuthor", "Blog author must be a valid MongoDB ID")
    .optional()
    .isMongoId(),
  check("updatedBy", "Updated by must be a valid MongoDB ID")
    .optional()
    .isMongoId(),
  check("status", "Status must be either 'publish' , 'draft' or 'scheduled")
    .optional()
    .isIn(["publish", "draft", "scheduled"]),
];
// ******************** Blog Categories ********************

export const validateBlogCategoryCreate = [
  // parentCategory: Optional, must be a valid MongoDB ObjectID
  check("parentCategory").optional(),

  // subCategories: Optional, must be an array of valid MongoDB ObjectIDs
  check("subCategories")
    .optional()
    .isArray()
    .withMessage("Subcategories must be an array")
    .custom((value) => {
      if (value.length > 0) {
        return value.every((id: Types.ObjectId) =>
          mongoose.isValidObjectId(id)
        );
      }
      return true;
    })
    .withMessage("All subcategory IDs must be valid MongoDB ObjectIDs"),

  check("image").optional().trim(),

  // name: Required, string, max 100 characters, unique (handled by Mongoose)
  check("name")
    .notEmpty()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string")
    .isLength({ max: 100 })
    .withMessage("Name must not exceed 100 characters")
    .trim()
    .escape(),

  // slug: Required, string, max 100 characters, URL-friendly, unique (handled by Mongoose)
  check("slug")
    .notEmpty()
    .withMessage("Slug is required")
    .isString()
    .withMessage("Slug must be a string")
    .isLength({ max: 100 })
    .withMessage("Slug must not exceed 100 characters")
    .trim()
    .toLowerCase(),

  // status: Optional, must be 'publish' or 'draft'
  check("status")
    .optional()
    .isIn(["active", "inactive"])
    .withMessage("Status must be either 'active' or 'inactive'"),
];

export const validateBlogCategoryUpdate = [
  // id: Required, must be a valid MongoDB ObjectID
  check("id")
    .notEmpty()
    .withMessage("Category ID is required")
    .isMongoId()
    .withMessage("Category ID must be a valid MongoDB ObjectID"),

  // parentCategory: Optional, must be a valid MongoDB ObjectID
  check("parentCategory").optional(),

  // subCategories: Optional, must be an array of valid MongoDB ObjectIDs
  check("subCategories")
    .optional()
    .isArray()
    .withMessage("Subcategories must be an array")
    .custom((value) => {
      if (value.length > 0) {
        return value.every((id: Types.ObjectId) =>
          mongoose.isValidObjectId(id)
        );
      }
      return true;
    })
    .withMessage("All subcategory IDs must be valid MongoDB ObjectIDs"),

  // image: Optional, must be a valid URL if provided
  check("image")
    .optional()
    .isURL()
    .withMessage("Image must be a valid URL")
    .trim(),

  // name: Optional, string, max 100 characters
  check("name")
    .optional()
    .isString()
    .withMessage("Name must be a string")
    .isLength({ max: 100 })
    .withMessage("Name must not exceed 100 characters")
    .trim()
    .escape(),

  // slug: Optional, string, max 100 characters, URL-friendly
  check("slug")
    .optional()
    .isString()
    .withMessage("Slug must be a string")
    .isLength({ max: 100 })
    .withMessage("Slug must not exceed 100 characters")
    .trim()
    .toLowerCase(),

  // status: Optional, must be 'publish' or 'draft'
  check("status")
    .optional()
    .isIn(["publish", "draft"])
    .withMessage("Status must be either 'publish' or 'draft'"),

  // blogs: Optional, must be an array of valid MongoDB ObjectIDs
  check("blogs")
    .optional()
    .isArray()
    .withMessage("Blogs must be an array")
    .custom((value) => {
      if (value.length > 0) {
        return value.every((id: Types.ObjectId) =>
          mongoose.isValidObjectId(id)
        );
      }
      return true;
    })
    .withMessage("All blog IDs must be valid MongoDB ObjectIDs"),

  // metaTitle: Optional, string, max 60 characters
  check("metaTitle")
    .optional()
    .isString()
    .withMessage("Meta title must be a string")
    .isLength({ max: 60 })
    .withMessage("Meta title must not exceed 60 characters")
    .trim()
    .escape(),

  // metaDescription: Optional, string, max 160 characters
  check("metaDescription")
    .optional()
    .isString()
    .withMessage("Meta description must be a string")
    .isLength({ max: 160 })
    .withMessage("Meta description must not exceed 160 characters")
    .trim()
    .escape(),

  // canonicalLink: Optional, must be a valid URL if provided
  check("canonicalLink").optional().trim(),

  // updatedBy: Optional, must be a valid MongoDB ObjectID
  check("updatedBy")
    .optional()
    .isMongoId()
    .withMessage("Updated by must be a valid MongoDB ObjectID"),
];

//  ********** Sevice Pages **********

export const ValidateCreateService = [
  check("metaTitle", "Meta Title is required").isString().trim(),
  check("metaDescription", "Meta Description is required").isString().trim(),
  check("canonicalLink", "Canonical Link is required").isString().trim(),
  check("openGraphImage").optional().isString().trim(),
  check("robotsText").optional().isString().trim(),
  check("focusKeyword", "Focus Keyword is required").isString().trim(),
  check("serviceName", "Service Name is required").isString().trim(),
  check("slug", "Slug is required").isString().trim(),
  check("colorScheme", "Color Scheme is requied").isString().trim(),
  check("parentService").optional().isMongoId(),
  check("status", "Status is required").isIn(["publish", "draft"]),
  check("childServices").optional().isArray(),
  check("childServices.*").isMongoId(),
  check("bodyData").optional().isArray(),
  check("bodyData.*").isObject(),
];

export const ValidateUpdateService = [
  check("metaTitle")
    .optional()
    .isString()
    .withMessage("Meta Title must be a string")
    .notEmpty()
    .withMessage("Meta Title cannot be empty")
    .trim(),
  check("metaDescription")
    .optional()
    .isString()
    .withMessage("Meta Description must be a string")
    .notEmpty()
    .withMessage("Meta Description cannot be empty")
    .trim(),
  check("canonicalLink")
    .optional()
    .isString()
    .withMessage("Canonical Link must be a string")
    .notEmpty()
    .withMessage("Canonical Link cannot be empty")
    .trim(),
  check("openGraphImage")
    .optional()
    .isString()
    .withMessage("Open Graph Image must be a string")
    .trim(),
  check("robotsText")
    .optional()
    .isString()
    .withMessage("Robots Text must be a string")
    .trim(),
  check("focusKeyword")
    .optional()
    .isString()
    .withMessage("Focus Keyword must be a string")
    .notEmpty()
    .withMessage("Focus Keyword cannot be empty")
    .trim(),
  check("serviceName")
    .optional()
    .isString()
    .withMessage("Service Name must be a string")
    .notEmpty()
    .withMessage("Service Name cannot be empty")
    .trim(),
  check("slug")
    .optional()
    .isString()
    .withMessage("Slug must be a string")
    .notEmpty()
    .withMessage("Slug cannot be empty")
    .trim(),
  check("colorScheme", "Color Scheme is required")
    .optional()
    .isString()
    .withMessage("Color Scheme must be a string")
    .notEmpty()
    .withMessage("Color Scheme cannot be empty")
    .trim(),
  check("parentService")
    .optional()
    .isMongoId()
    .withMessage("Parent Service must be a valid Mongo ID"),
  check("status")
    .optional()
    .isIn(["publish", "draft"])
    .withMessage("Status must be either 'publish' or 'draft'"),
  check("childServices")
    .optional()
    .isArray()
    .withMessage("Child Services must be an array"),
  check("childServices.*")
    .optional()
    .isMongoId()
    .withMessage("Each Child Service must be a valid Mongo ID"),
  check("bodyData")
    .optional()
    .isArray()
    .withMessage("Body Data must be an array"),
  check("bodyData.*")
    .optional()
    .isObject()
    .withMessage("Each Body Data entry must be an object"),
];

// ********** Case Studies **********
export const validateCaseStudyUpdateCategory = [
  check("categoryName", "Category name is required")
    .optional()
    .notEmpty()
    .isString()
    .trim(),
  check("categorySlug", "Category slug is required")
    .optional()
    .notEmpty()
    .isString()
    .trim(),
  check("technologies")
    .optional()
    .isArray()
    .withMessage("Technologies must be an array"),
  check("technologies.*.icon", "Technology icon is required")
    .optional()
    .if(
      (value, { req }) =>
        req.body.technologies && req.body.technologies.length > 0
    )
    .notEmpty()
    .isString()
    .trim(),
  check("technologies.*.name", "Technology name is required")
    .optional()
    .if(
      (value, { req }) =>
        req.body.technologies && req.body.technologies.length > 0
    )
    .notEmpty()
    .isString()
    .trim(),
  check("caseStudies")
    .optional()
    .isArray()
    .withMessage("Case studies must be an array"),
  check("caseStudies.*.caseStudyId", "Case study ID must be a valid Mongo ID")
    .optional()
    .if(
      (value, { req }) =>
        req.body.caseStudies && req.body.caseStudies.length > 0
    )
    .isMongoId(),
  check("status", "Status must be a boolean").optional().isBoolean(),
];

// ************** Products *********************
export const validateCreateProduct = [
  check("featuredImage")
    .isString()
    .withMessage("Featured image URL is required")
    .notEmpty()
    .withMessage("Featured image URL should not be empty"),

  check("name")
    .isString()
    .withMessage("Product name is required")
    .notEmpty()
    .withMessage("Product name should not be empty"),

  check("description")
    .isString()
    .withMessage("Description is required")
    .optional(),

  check("category")
    .isMongoId()
    .withMessage("Invalid category ID format")
    .notEmpty()
    .withMessage("Category is required"),

  check("subCategory")
    .optional()
    .isMongoId()
    .withMessage("Invalid subCategory ID format")
    .notEmpty()
    .withMessage("Sub-Category is required"),

  check("slug")
    .optional()
    .isString()
    .withMessage("Slug should be a string")
    .isLength({ max: 100 })
    .withMessage("Slug should not exceed 100 characters"),

  check("pricePerUnit")
    .isNumeric()
    .withMessage("Price must be a number")
    .notEmpty()
    .withMessage("Price is required")
    .custom((value) => value >= 0)
    .withMessage("Price must be greater than or equal to 0"),

  check("pricingType")
    .optional()
    .isIn(["perWord", "perPost", "perReview", "perMonth", "perQuantity"])
    .withMessage(
      "Pricing type must be one of 'perWord', 'perPost', 'perReview', 'perMonth' or 'perQuantity'"
    ),

  check("stock")
    .optional()
    .isNumeric()
    .isInt()
    .withMessage("Stock must be an integer")
    .custom((value) => value >= 0)
    .withMessage("Stock must be greater than or equal to 0"),

  check("images")
    .optional()
    .isArray()
    .withMessage("Images should be an array of strings"),

  check("tags")
    .optional()
    .isArray()
    .withMessage("Tags should be an array of strings"),

  check("priority")
    .optional()
    .isInt()
    .withMessage("Priority must be an integer"),

  check("keywords")
    .optional()
    .isArray()
    .withMessage("Keywords should be an array of strings"),

  check("formId").optional().isMongoId().withMessage("Invalid form ID format"),

  check("metaTitle")
    .optional()
    .isString()
    .withMessage("Meta title should be a string"),

  check("metaDescription")
    .optional()
    .isString()
    .withMessage("Meta description should be a string"),

  check("canonicalLink")
    .optional()
    .isString()
    .withMessage("Canonical link should be a string"),

  check("status")
    .optional()
    .isIn(["active", "inactive", "archived", "out of stock"])
    .withMessage(
      "Status must be one of active, inactive, archived, or out of stock"
    ),

  check("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured must be a boolean"),
];

export const validateUpdateProduct = [
  check("featuredImage")
    .optional()
    .isString()
    .withMessage("Featured image URL must be a string")
    .notEmpty()
    .withMessage("Featured image URL should not be empty"),

  check("name")
    .optional()
    .isString()
    .withMessage("Product name must be a string")
    .notEmpty()
    .withMessage("Product name should not be empty"),

  check("description")
    .optional()
    .isString()
    .withMessage("Description must be a string")
    .notEmpty()
    .withMessage("Description should not be empty"),

  check("userId").optional().isMongoId().withMessage("Invalid user ID format"),

  check("formId").optional().isMongoId().withMessage("Invalid form ID format"),

  check("category")
    .optional()
    .isMongoId()
    .withMessage("Invalid category ID format"),

  check("subCategory")
    .optional()
    .isMongoId()
    .withMessage("Invalid subCategory ID format"),

  check("slug")
    .optional()
    .isString()
    .withMessage("Slug should be a string")
    .isLength({ max: 100 })
    .withMessage("Slug should not exceed 100 characters"),

  check("price")
    .optional()
    .isNumeric()
    .withMessage("Price must be a number")
    .custom((value) => value >= 0)
    .withMessage("Price must be greater than or equal to 0"),

  check("quantity")
    .optional()
    .isNumeric()
    .withMessage("Quantity unit must be a number"),

  check("pricingType")
    .optional()
    .isIn(["perWord", "perPost", "perReview", "perMonth", "perQuantity"])
    .withMessage(
      "Pricing type must be one of 'perWord', 'perPost', 'perReview', 'perMonth' or 'perQuantity'"
    ),

  check("stock")
    .optional()
    .isInt()
    .withMessage("Stock must be an integer")
    .custom((value) => value >= 0)
    .withMessage("Stock must be greater than or equal to 0"),

  check("images")
    .optional()
    .isArray()
    .withMessage("Images should be an array of strings"),

  check("tags")
    .optional()
    .isArray()
    .withMessage("Tags should be an array of strings"),

  check("priority")
    .optional()
    .isInt()
    .withMessage("Priority must be an integer"),

  check("keywords")
    .optional()
    .isArray()
    .withMessage("Keywords should be an array of strings"),

  check("status")
    .optional()
    .isIn(["active", "inactive", "archived", "out of stock"])
    .withMessage(
      "Status must be one of active, inactive, archived, or out of stock"
    ),

  check("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured must be a boolean"),
];

export const validateProductCreateCategory = [
  // parentCategory: Optional, must be a valid MongoDB ObjectID
  check("parentCategory").optional(),

  // subCategories: Optional, must be an array of valid MongoDB ObjectIDs
  check("subCategories")
    .optional()
    .isArray()
    .withMessage("Subcategories must be an array")
    .custom((value) => {
      if (value.length > 0) {
        return value.every((id: Types.ObjectId) =>
          mongoose.isValidObjectId(id)
        );
      }
      return true;
    })
    .withMessage("All subcategory IDs must be valid MongoDB ObjectIDs"),

  check("image").optional().trim(),

  // name: Required, string, max 100 characters, unique (handled by Mongoose)
  check("name")
    .notEmpty()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string")
    .isLength({ max: 100 })
    .withMessage("Name must not exceed 100 characters")
    .trim()
    .escape(),

  // slug: Required, string, max 100 characters, URL-friendly, unique (handled by Mongoose)
  check("slug")
    .notEmpty()
    .withMessage("Slug is required")
    .isString()
    .withMessage("Slug must be a string")
    .isLength({ max: 100 })
    .withMessage("Slug must not exceed 100 characters")
    .trim()
    .toLowerCase(),

  // status: Optional, must be 'publish' or 'draft'
  check("status")
    .optional()
    .isIn(["active", "inactive"])
    .withMessage("Status must be either 'active' or 'inactive'"),
];

export const validateProductUpdateCategory = [
  check("name")
    .optional()
    .isString()
    .withMessage("Category name is required")
    .notEmpty()
    .withMessage("Category name should not be empty"),

  check("description")
    .optional()
    .isString()
    .withMessage("Description should be a string"),

  check("parentCategory")
    .optional({ nullable: true })
    .isMongoId()
    .withMessage("Invalid parent category ID format"),

  check("children")
    .optional()
    .isArray()
    .withMessage("Children should be an array of category IDs")
    .custom((value) =>
      value.every((v: any) => mongoose.Types.ObjectId.isValid(v))
    )
    .withMessage("Each child category ID should be a valid ObjectId"),

  check("products")
    .optional()
    .isArray()
    .withMessage("Products should be an array of product IDs")
    .custom((value) =>
      value.every((v: any) => mongoose.Types.ObjectId.isValid(v))
    )
    .withMessage("Each product ID should be a valid ObjectId"),

  check("slug")
    .optional()
    .isString()
    .withMessage("Slug should be a string")
    .isLength({ max: 100 })
    .withMessage("Slug should not exceed 100 characters"),

  check("image")
    .optional()
    .isString()
    .withMessage("Image URL should be a string"),

  check("metaTitle")
    .optional()
    .isString()
    .withMessage("Meta title should be a string"),

  check("metaDescription")
    .optional()
    .isString()
    .withMessage("Meta description should be a string"),

  check("canonicalLink")
    .optional()
    .isString()
    .withMessage("Canonical link should be a string"),

  check("status")
    .optional()
    .isIn(["active", "inactive"])
    .withMessage("Status must be one of 'active' or 'inactive'"),

  check("createdBy")
    .optional()
    .isMongoId()
    .withMessage("Invalid user ID format"),

  check("updatedBy")
    .optional()
    .isMongoId()
    .withMessage("Invalid user ID format"),
];

// ******************** Tickets ********************
export const validateCreateTicket = [
  body("subject")
    .trim()
    .notEmpty()
    .withMessage("Subject is required")
    .isLength({ max: 100 })
    .withMessage("Subject must be less than 100 characters"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ max: 2000 })
    .withMessage("Description must be less than 2000 characters"),

  body("priority")
    .optional()
    .isIn(Object.values(TicketPriority))
    .withMessage(
      `Priority must be one of: ${Object.values(TicketPriority).join(", ")}`
    ),

  body("customer").optional().isMongoId().withMessage("Invalid customer ID"),

  body("assignedTo")
    .optional()
    .isMongoId()
    .withMessage("Invalid assigned user ID"),
];

export const validateUpdateTicket = [
  body("message")
    .if(body("message").exists())
    .trim()
    .notEmpty()
    .withMessage("Message cannot be empty if provided")
    .isLength({ max: 5000 })
    .withMessage("Message must be less than 5000 characters"),

  body("status")
    .optional()
    .isIn(Object.values(TicketStatus))
    .withMessage(
      `Status must be one of: ${Object.values(TicketStatus).join(", ")}`
    ),

  body("priority")
    .optional()
    .isIn(Object.values(TicketPriority))
    .withMessage(
      `Priority must be one of: ${Object.values(TicketPriority).join(", ")}`
    ),
];

// ******************** Case Studies ********************

export const validateCaseStudyCategory = [
  check("name", "Category name is required").notEmpty().isString().trim(),
  check("slug", "Slug must be a valid string").optional().isString().trim(),
  check("image", "Image must be a valid URL")
    .optional()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .trim(),
  check(
    "parentCategory",
    "Parent category must be a valid MongoDB ID"
  ).optional(),
  check("status", "Status must be either 'active' or 'inactive'")
    .optional()
    .isIn(["active", "inactive"]),
  check("createdBy", "Created by must be a valid MongoDB ID")
    .optional()
    .isMongoId(),
];

export const validateUpdateCaseStudyCategory = [
  check("name", "Category name must be a string").optional().isString().trim(),
  check("slug", "Slug must be a valid string").optional().isString().trim(),
  check("metaTitle", "Meta title must be a string")
    .optional()
    .isString()
    .trim(),
  check("metaDescription", "Meta description must be a string")
    .optional()
    .isString()
    .trim(),
  check("canonicalLink", "Canonical link must be a valid URL")
    .optional()
    .trim(),
  check("image", "Image must be a valid URL")
    .optional()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .trim(),
  check("tags", "Tags must be an array of strings")
    .optional()
    .isArray()
    .custom((value: string[]) => {
      return value.every(
        (tag) => typeof tag === "string" && tag.trim().length > 0
      );
    })
    .withMessage("Each tag must be a non-empty string"),
  check(
    "parentCategory",
    "Parent category must be a valid MongoDB ID"
  ).optional(),
  check("status", "Status must be either 'active' or 'inactive'")
    .optional()
    .isIn(["active", "inactive"]),
  check("updatedBy", "Updated by must be a valid MongoDB ID")
    .optional()
    .isMongoId(),
];

export const validateCaseStudy = [
  // Case Study fields
  check("name", "Case study name is required").notEmpty().isString().trim(),
  check("slug", "Slug must be a valid string").optional().isString().trim(),
  check("category", "Category must be a valid MongoDB ID")
    .optional()
    .isString(),
  check("colorScheme", "Color scheme is required").notEmpty().isString().trim(),
  check("status", "Status must be either 'active' or 'inactive'")
    .optional()
    .isIn(["active", "inactive"]),
  check("bodyData", "Body data must be an array").optional().isArray(),
  check("createdBy", "Created by must be a valid MongoDB ID").optional(),
  check("updatedBy", "Updated by must be a valid MongoDB ID").optional(),

  // SEO fields
  body("seo.metaTitle", "SEO meta title is required")
    .notEmpty()
    .isString()
    .trim(),
  body("seo.metaDescription", "SEO meta description is required")
    .notEmpty()
    .isString()
    .trim(),
  body("seo.canonicalLink", "SEO canonical link must be a valid string")
    .notEmpty()
    .isString()
    .trim(),
  body("seo.focusKeyword", "SEO focus keyword is required")
    .notEmpty()
    .isString()
    .trim(),
  body("seo.keywords", "SEO keywords must be an array of strings")
    .optional()
    .isArray()
    .custom((value: string[]) => {
      return value.every(
        (keyword) => typeof keyword === "string" && keyword.trim().length > 0
      );
    })
    .withMessage("Each SEO keyword must be a non-empty string"),
  body("seo.openGraph.title", "Open Graph title must be a valid string")
    .optional()
    .isString()
    .trim(),
  body(
    "seo.openGraph.description",
    "Open Graph description must be a valid string"
  )
    .optional()
    .isString()
    .trim(),
  body("seo.openGraph.image", "Open Graph image must be a valid URL")
    .optional()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .trim(),
  body("seo.openGraph.type", "Open Graph type must be a valid string")
    .optional()
    .isString()
    .trim(),
  body("seo.openGraph.url", "Open Graph URL must be a valid URL")
    .optional()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .trim(),
  body("seo.openGraph.siteName", "Open Graph site name must be a valid string")
    .optional()
    .isString()
    .trim(),
  body("seo.twitterCard.cardType", "Twitter card type must be a valid string")
    .optional()
    .isString()
    .trim(),
  body("seo.twitterCard.site", "Twitter card site must be a valid string")
    .optional()
    .isString()
    .trim(),
  body("seo.twitterCard.creator", "Twitter card creator must be a valid string")
    .optional()
    .isString()
    .trim(),
  body("seo.twitterCard.title", "Twitter card title must be a valid string")
    .optional()
    .isString()
    .trim(),
  body(
    "seo.twitterCard.description",
    "Twitter card description must be a valid string"
  )
    .optional()
    .isString()
    .trim(),
  body("seo.twitterCard.image", "Twitter card image must be a valid URL")
    .optional()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .trim(),
  body("seo.robotsText", "SEO robots text is required")
    .notEmpty()
    .isString()
    .trim(),
  body("seo.schemaOrg", "SEO schema.org must be a valid string")
    .optional()
    .isString()
    .trim(),
  body("seo.bodyScript", "SEO body script must be a valid string")
    .optional()
    .isString()
    .trim(),
  body("seo.headerScript", "SEO header script must be a valid string")
    .optional()
    .isString()
    .trim(),
  body("seo.footerScript", "SEO footer script must be a valid string")
    .optional()
    .isString()
    .trim(),
  body("seo.priority", "SEO priority must be a number between 0 and 1")
    .optional()
    .isFloat({ min: 0, max: 1 }),
  body("seo.changeFrequency", "SEO change frequency must be a valid value")
    .optional()
    .isIn([
      "always",
      "hourly",
      "daily",
      "weekly",
      "monthly",
      "yearly",
      "never",
    ]),
  body("seo.lastModified", "SEO last modified must be a valid date")
    .optional()
    .isISO8601()
    .toDate(),
  body("seo.redirect.type", "SEO redirect type must be '301', '302', or null")
    .optional()
    .isIn(["301", "302", null]),
  body("seo.redirect.url", "SEO redirect URL must be a valid string")
    .optional()
    .isString()
    .trim(),
];

export const validateUpdateCaseStudy = [
  // Case Study fields
  check("id", "Case study ID is required").notEmpty().isMongoId(),
  check("name", "Case study name must be a valid string")
    .optional()
    .isString()
    .trim(),
  check("slug", "Slug must be a valid string").optional().isString().trim(),
  check("category", "Category must be a valid MongoDB ID").optional(),
  check("colorScheme", "Color scheme must be a valid string")
    .optional()
    .isString()
    .trim(),
  check("status", "Status must be either 'active' or 'inactive'")
    .optional()
    .isIn(["active", "inactive"]),
  check("bodyData", "Body data must be an array").optional().isArray(),
  check("updatedBy", "Updated by must be a valid MongoDB ID").optional(),

  // SEO fields (all optional for updates)
  body("seo.metaTitle", "SEO meta title must be a valid string")
    .optional()
    .isString()
    .trim(),
  body("seo.metaDescription", "SEO meta description must be a valid string")
    .optional()
    .isString()
    .trim(),
  body("seo.canonicalLink", "SEO canonical link must be a valid string")
    .optional()
    .isString()
    .trim(),
  body("seo.focusKeyword", "SEO focus keyword must be a valid string")
    .optional()
    .isString()
    .trim(),
  body("seo.keywords", "SEO keywords must be an array of strings")
    .optional()
    .isArray()
    .custom((value: string[]) => {
      return value.every(
        (keyword) => typeof keyword === "string" && keyword.trim().length > 0
      );
    })
    .withMessage("Each SEO keyword must be a non-empty string"),
  body("seo.openGraph.title", "Open Graph title must be a valid string")
    .optional()
    .isString()
    .trim(),
  body(
    "seo.openGraph.description",
    "Open Graph description must be a valid string"
  )
    .optional()
    .isString()
    .trim(),
  body("seo.openGraph.image", "Open Graph image must be a valid URL")
    .optional()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .trim(),
  body("seo.openGraph.type", "Open Graph type must be a valid string")
    .optional()
    .isString()
    .trim(),
  body("seo.openGraph.url", "Open Graph URL must be a valid URL")
    .optional()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .trim(),
  body("seo.openGraph.siteName", "Open Graph site name must be a valid string")
    .optional()
    .isString()
    .trim(),
  body("seo.twitterCard.cardType", "Twitter card type must be a valid string")
    .optional()
    .isString()
    .trim(),
  body("seo.twitterCard.site", "Twitter card site must be a valid string")
    .optional()
    .isString()
    .trim(),
  body("seo.twitterCard.creator", "Twitter card creator must be a valid string")
    .optional()
    .isString()
    .trim(),
  body("seo.twitterCard.title", "Twitter card title must be a valid string")
    .optional()
    .isString()
    .trim(),
  body(
    "seo.twitterCard.description",
    "Twitter card description must be a valid string"
  )
    .optional()
    .isString()
    .trim(),
  body("seo.twitterCard.image", "Twitter card image must be a valid URL")
    .optional()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .trim(),
  body("seo.robotsText", "SEO robots text must be a valid string")
    .optional()
    .isString()
    .trim(),
  body("seo.schemaOrg", "SEO schema.org must be a valid string")
    .optional()
    .isString()
    .trim(),
  body("seo.bodyScript", "SEO body script must be a valid string")
    .optional()
    .isString()
    .trim(),
  body("seo.headerScript", "SEO header script must be a valid string")
    .optional()
    .isString()
    .trim(),
  body("seo.footerScript", "SEO footer script must be a valid string")
    .optional()
    .isString()
    .trim(),
  body("seo.priority", "SEO priority must be a number between 0 and 1")
    .optional()
    .isFloat({ min: 0, max: 1 }),
  body("seo.changeFrequency", "SEO change frequency must be a valid value")
    .optional()
    .isIn([
      "always",
      "hourly",
      "daily",
      "weekly",
      "monthly",
      "yearly",
      "never",
    ]),
  body("seo.lastModified", "SEO last modified must be a valid date")
    .optional()
    .isISO8601()
    .toDate(),
  body("seo.redirect.type", "SEO redirect type must be '301', '302', or null")
    .optional()
    .isIn(["301", "302", null]),
  body("seo.redirect.url", "SEO redirect URL must be a valid string")
    .optional()
    .isString()
    .trim(),
];

export const validateDeleteCaseStudy = [
  query("id", "Case study ID is required").notEmpty().isMongoId(),
];
