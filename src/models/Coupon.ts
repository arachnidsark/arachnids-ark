import mongoose, { Schema } from 'mongoose';

/**
 * Coupon model — discount codes configured by admins.
 * Allows percentage or flat off, min cart subtotal, usage caps, and user limits.
 */

const couponSchema = new Schema(
  {
    _id: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    description: { type: String, default: '' },
    discountType: { type: String, enum: ['percentage', 'flat'], required: true },
    discountValue: { type: Number, required: true },
    minOrderValue: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: null },       // null = no cap
    maxUses: { type: Number, default: 0 },                  // 0 = unlimited
    maxUsesPerUser: { type: Number, default: 0 },           // 0 = unlimited
    usedCount: { type: Number, default: 0 },
    usedBy: [{ type: String }],
    validFrom: { type: String, required: true },
    validUntil: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    applicableTo: { type: String, enum: ['all', 'products', 'courses', 'consultations'], default: 'all' },
    applicableCategories: [{ type: String }],               // empty = all
    excludedProductIds: [{ type: String, default: [] }],
    excludedCourseIds: [{ type: String, default: [] }],
    excludedConsultationIds: [{ type: String, default: [] }],
    quantityDiscount: {
      type: {
        enabled: { type: Boolean, default: false },
        minQuantity: { type: Number, default: 0 },
        discountType: { type: String, enum: ['percentage', 'flat'], default: 'percentage' },
        discountValue: { type: Number, default: 0 },
        minOrderValue: { type: Number, default: 0 },
      },
      default: null,
    },
    autoApply: { type: Boolean, default: false },
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

export const CouponModel =
  (mongoose.models.Coupon as mongoose.Model<typeof couponSchema extends Schema<infer T> ? T : never>) ||
  mongoose.model('Coupon', couponSchema);
