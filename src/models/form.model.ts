import mongoose, { Model, Schema } from "mongoose";
import { FormField, Form } from "../types/productTypes";

const FormFieldSchema = new Schema<FormField>({
  field: {
    type: Schema.Types.ObjectId,
    ref: "ProductFormField",
    required: true,
  },
  fieldOrder: { type: Number, required: true, default: 1 },
});

const FormSchema = new Schema<Form>(
  {
    title: { type: String, required: true },
    fields: [FormFieldSchema],
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

const FormModel: Model<Form> = mongoose.model<Form>("ProductForm", FormSchema);

export default FormModel;
