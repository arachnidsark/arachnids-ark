import mongoose, { Schema } from 'mongoose';

/**
 * Product model — represents livestock items.
 * Each product belongs to a dynamic category and stores category-specific
 * metadata in the `customMeta` mixed field.
 * Legacy metadata schemas (tarantulaMeta, scorpionMeta, centipedeMeta)
 * are kept for backwards compatibility.
 */

const productSizeSchema = new Schema(
  {
    size: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const tarantulaMetaSchema = new Schema(
  {
    world: { type: String, enum: ['New World', 'Old World'] },
    type: { type: String, enum: ['Terrestrial', 'Arboreal', 'Fossorial'] },
    temperament: { type: String, enum: ['docile', 'semi-aggressive', 'aggressive', 'defensive'] },
    growthRate: { type: String, enum: ['Slow', 'Medium', 'Fast'] },
    sizeCategory: { type: String },
    gender: { type: String },
  },
  { _id: false }
);

const scorpionMetaSchema = new Schema(
  {
    habitatType: { type: String, enum: ['Desert', 'Tropical Forest'] },
    venomPotency: { type: String, enum: ['Mild', 'Moderate', 'Medically Significant', 'Lethal'] },
    pincerType: { type: String, enum: ['Thin', 'Medium', 'Thick'] },
    communal: { type: Boolean, default: false },
    sizeCategory: { type: String },
    gender: { type: String },
  },
  { _id: false }
);

const centipedeMetaSchema = new Schema(
  {
    habitatType: { type: String, enum: ['Tropical', 'Arid'] },
    venomPotency: { type: String, enum: ['Mild', 'Moderate', 'Severe', 'Potent'] },
    legPairs: { type: String },
    sizeCategory: { type: String },
    gender: { type: String },
  },
  { _id: false }
);

const productSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    scientificName: { type: String, required: true, trim: true },
    mainCategory: { type: String, required: true },
    careLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'], required: true },
    humidity: { type: String },
    temperature: { type: String },
    feeding: { type: String },
    description: { type: String },
    images: [{ type: String }],
    featured: { type: Boolean, default: false },
    available: { type: Boolean, default: true },
    isVisible: { type: Boolean, default: true },
    sizes: [productSizeSchema],
    likes: { type: Number, default: 0 },

    // Generic category metadata (new system)
    customMeta: { type: Schema.Types.Mixed },

    // Legacy category-specific metadata (kept for backwards compatibility)
    tarantulaMeta: { type: tarantulaMetaSchema },
    scorpionMeta: { type: scorpionMetaSchema },
    centipedeMeta: { type: centipedeMetaSchema },

    // Legacy fields for backwards compatibility
    category: { type: String },
    origin: { type: String },
    temperament: { type: String },
    sizeCategory: { type: String },
    gender: { type: String },
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

// Indexes
productSchema.index({ mainCategory: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ available: 1, isVisible: 1 });

export const ProductModel =
  (mongoose.models.Product as mongoose.Model<typeof productSchema extends Schema<infer T> ? T : never>) ||
  mongoose.model('Product', productSchema);
