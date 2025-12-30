import mongoose, { Schema } from "mongoose";
import { PermissionModuleType } from "../types/permission-module.types";
const permissionModuleSchema = new Schema(
  {
    name: { type: String, required: true },
    value: { type: String, required: true },
    status: { type: String },
  },
  {
    timestamps: true,
  }
);

permissionModuleSchema.pre("save", function (next) {
  if (this.isModified("value")) {
    this.value = this.value.toLowerCase();
  }
  next();
});

const PermissionModule = mongoose.model<PermissionModuleType & Document>(
  "Permission_Module",
  permissionModuleSchema
);

export default PermissionModule;
