import { Types } from "mongoose";

export type ServiceTypes = {
  _id?: Types.ObjectId;
  metaTitle: string;
  metaDescription: string;
  canonicalLink: string;
  openGraphImage?: string;
  robotsText?: string;
  focusKeyword: string;
  bodyScript?: string;
  headerScript?: string;
  footerScript?: string;
  serviceName: string;
  slug: string;
  colorScheme: string;
  parentService?: Types.ObjectId | null;
  status: "publish" | "draft";
  childServices: Array<{
    childServiceId: Types.ObjectId;
  }>;
  bodyData: Array<Record<string, any>>;
};
