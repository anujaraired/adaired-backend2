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

permissionModuleSchema.pre("save", function () {
  if (this.isModified("value") && typeof this.value === "string") {
    this.value = this.value.toLowerCase();
  }
});

const PermissionModule = mongoose.model<PermissionModuleType & Document>(
  "Permission_Module",
  permissionModuleSchema
);

export default PermissionModule;
