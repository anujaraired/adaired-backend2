import mongoose, { Schema } from "mongoose";
import { ServiceTypes } from "../types/serviceTypes";

const serviceSchema = new Schema<ServiceTypes>(
  {
    metaTitle: { type: String, required: true },
    metaDescription: { type: String, required: true },
    canonicalLink: { type: String, required: true },
    openGraphImage: { type: String },
    robotsText: { type: String, default: "noindex, nofollow" },
    focusKeyword: { type: String, required: true },
    bodyScript: { type: String },
    headerScript: { type: String },
    footerScript: { type: String },
    serviceName: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    colorScheme: { type: String, required: true },
    parentService: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      default: null,
    },
    status: { type: String, enum: ["publish", "draft"], required: true },
    childServices: {
      type: [
        {
          childServiceId: { type: Schema.Types.ObjectId, ref: "Service" },
          childServiceName: { type: String },
          childServiceSlug: { type: String },
        },
      ],
    },
    bodyData: [{ type: Schema.Types.Mixed }],
  },
  {
    timestamps: true,
  }
);

const Service = mongoose.model<ServiceTypes>("Service", serviceSchema);

export default Service;
