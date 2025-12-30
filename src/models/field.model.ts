import mongoose, { Model, Schema } from "mongoose";
import { Field } from "../types/productTypes";

const OptionSchema = new Schema({
  value: { type: String, required: true },
  name: { type: String, required: true },
});

const FieldSchema = new Schema<Field>(
  {
    name: { type: String, required: true },
    label: { type: String, required: true },
    inputType: { type: String, required: true, default: "Text" },
    inputMinLength: { type: Number, default: null },
    inputMaxLength: { type: Number, default: null },
    inputPlaceholder: { type: String, default: null },
    inputValidationPattern: { type: String, default: null },
    inputRequired: { type: Boolean, default: false },
    customClassName: { type: String, default: null },
    multipleOptions: [OptionSchema],
  },
  { timestamps: true }
);

const FieldModel: Model<Field> = mongoose.model<Field>("ProductFormField", FieldSchema);

export default FieldModel;
