import { Schema } from "mongoose";
import slugify from "slugify";

const cleanCanonicalLink = (input: string): string => {
  if (!input) return "";

  // Handle base URL
  if (input.startsWith(process.env.LIVE_DOMAIN || "")) {
    return input
      .replace(process.env.LIVE_DOMAIN, "")
      .replace(/^\/+/, "")
      .replace(/\/+$/, ""); // Trim trailing slashes too
  }

  // Handle full URLs
  if (input.includes("://")) {
    try {
      const url = new URL(input);
      return url.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
    } catch {
      return slugify(input, { lower: true, strict: true });
    }
  }
  // Handle slugs directly
  return input
    .split("/") 
    .map((part) => slugify(part, { lower: true, strict: true })) 
    .join("/"); 
};

const seoSchema = new Schema({
  metaTitle: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60,
  },
  metaDescription: {
    type: String,
    required: true,
    trim: true,
    maxlength: 160,
  },
  canonicalLink: {
    type: String,
    required: true,
    trim: true,
    set: cleanCanonicalLink,
  },
  focusKeyword: { type: String, required: true, trim: true },
  keywords: { type: [String], default: [] },
  openGraph: {
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    image: { type: String, trim: true, default: null },
    type: { type: String, trim: true, default: "website" },
    url: { type: String, trim: true },
    siteName: { type: String, trim: true },
  },
  twitterCard: {
    cardType: { type: String, trim: true, default: "summary_large_image" },
    site: { type: String, trim: true },
    creator: { type: String, trim: true },
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    image: { type: String, trim: true, default: null },
  },
  robotsText: {
    type: String,
    required: true,
    trim: true,
    default: "index,follow",
  },
  schemaOrg: { type: String, default: null },
  bodyScript: { type: String, default: null },
  headerScript: { type: String, default: null },
  footerScript: { type: String, default: null },
  priority: { type: Number, min: 0, max: 1, default: 0.5 },
  changeFrequency: {
    type: String,
    enum: ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"],
    default: "monthly",
  },
  lastModified: { type: Date, default: Date.now },
  redirect: {
    type: { type: String, enum: ["301", "302", "none"], default: "none" },
    url: { type: String, trim: true, default: null },
  },
});

export default seoSchema;

// Utility to check if SEO fields are present in the update body
export const hasSeoFields = (body: any): boolean => {
  const seoFields = [
    "metaTitle",
    "metaDescription",
    "canonicalLink",
    "focusKeyword",
    "keywords",
    "openGraph",
    "twitterCard",
    "robotsText",
    "schemaOrg",
    "bodyScript",
    "headerScript",
    "footerScript",
    "priority",
    "changeFrequency",
    "redirect",
  ];
  return seoFields.some((field) => body.seo && field in body.seo);
};
