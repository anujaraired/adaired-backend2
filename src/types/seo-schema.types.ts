export interface OpenGraph {
  title?: string;
  description?: string;
  image?: string | null;
  type?: string;
  url?: string;
  siteName?: string;
}

export interface TwitterCard {
  cardType?: string;
  site?: string;
  creator?: string;
  title?: string;
  description?: string;
  image?: string | null;
}

export interface Redirect {
  type?: "301" | "302" | "none";
  url?: string | null;
}

export interface SEO {
  metaTitle: string;
  metaDescription: string;
  canonicalLink: string;
  focusKeyword: string;
  keywords?: string[];
  openGraph?: OpenGraph;
  twitterCard?: TwitterCard;
  robotsText: string;
  schemaOrg?: string | null;
  bodyScript?: string | null;
  headerScript?: string | null;
  footerScript?: string | null;
  priority?: number;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  lastModified?: Date;
  redirect?: Redirect;
}