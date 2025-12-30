import mongoose, { Schema } from "mongoose";
import { RoleTypes } from "../types/roleTypes";

const roleSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      index: {
        unique: true,
        collation: { locale: "en", strength: 2 },
      },
    },
    description: { type: String },
    status: { type: Boolean, default: true },
    permissions: [
      {
        module: String,
        permissions: [Number],
      },
    ],
    users: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

roleSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.name = this.name.toLowerCase();
  }
  next();
});

const Role = mongoose.model<RoleTypes & Document>("Role", roleSchema);

export default Role;
