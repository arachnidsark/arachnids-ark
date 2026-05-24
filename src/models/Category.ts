import mongoose, { Schema } from 'mongoose';

/**
 * Category model — defines product categories and their custom metadata fields.
 * Each category has a dynamic list of fields that products in that category must/can fill in.
 * Field types: text, select, number, boolean, textarea, multi-select.
 */

const categoryFieldSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    type: {
      type: String,
      enum: ['text', 'select', 'number', 'boolean', 'textarea', 'multi-select'],
      required: true,
    },
    options: [{ type: String }], // For 'select' and 'multi-select' types
    required: { type: Boolean, default: false },
    showAsBadge: { type: Boolean, default: false },
  },
  { _id: false }
);

const categorySchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    icon: { type: String }, // Optional emoji or lucide icon name
    fields: [categoryFieldSchema],
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transform: (_doc: any, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transform: (_doc: any, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

categorySchema.index({ sortOrder: 1 });
categorySchema.index({ isActive: 1 });

export const CategoryModel =
  (mongoose.models.Category as mongoose.Model<typeof categorySchema extends Schema<infer T> ? T : never>) ||
  mongoose.model('Category', categorySchema);
