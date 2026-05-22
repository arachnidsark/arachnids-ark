import mongoose, { Schema } from 'mongoose';

/**
 * Order model — tracks customer orders containing products, courses, and/or consultations.
 * Items are embedded subdocuments with flexible metadata per item type.
 */

const orderItemMetadataSchema = new Schema(
  {
    size: { type: String },
    urgency: { type: String },
    query: { type: String },
    duration: { type: Number },
    label: { type: String },
  },
  { _id: false }
);

const orderItemSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    image: { type: String },
    quantity: { type: Number, required: true, default: 1 },
    price: { type: Number, required: true },
    type: { type: String, enum: ['product', 'course', 'consultation'], required: true },
    status: { type: String },
    metadata: { type: orderItemMetadataSchema },
  },
  { _id: false }
);

const couponAppliedSchema = new Schema(
  {
    code: { type: String, required: true },
    discountType: { type: String, enum: ['percentage', 'flat'], required: true },
    discountValue: { type: Number, required: true },
    discountAmount: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String },
    userEmail: { type: String },
    items: [orderItemSchema],
    message: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'awaiting_payment', 'payment_verified', 'order_shipped', 'order_completed', 'order_cancelled'],
      default: 'pending',
    },
    paymentScreenshot: { type: String },
    adminNote: { type: String },
    deliveryName: { type: String },
    deliveryPhone: { type: String },
    deliveryAddress: { type: String },
    totalPrice: { type: Number, required: true },
    shippingCharge: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    trackingId: { type: String },
    courierPartner: { type: String },
    cancellationReason: { type: String },
    emailsSent: [{ type: String }],
    coupon: { type: couponAppliedSchema, default: null },
    discountAmount: { type: Number, default: 0 },
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
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

export const OrderModel =
  (mongoose.models.Order as mongoose.Model<typeof orderSchema extends Schema<infer T> ? T : never>) ||
  mongoose.model('Order', orderSchema);
