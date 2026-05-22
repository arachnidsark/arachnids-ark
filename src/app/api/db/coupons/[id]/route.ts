import { connectDB } from '@/lib/mongoose';
import { CouponModel } from '@/models';

// GET /api/db/coupons/[id]
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const coupon = await CouponModel.findById(id);
    if (!coupon) return Response.json({ error: 'Coupon not found' }, { status: 404 });
    return Response.json(coupon.toJSON());
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/db/coupons/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const updates = await request.json();
    const coupon = await CouponModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!coupon) return Response.json({ error: 'Coupon not found' }, { status: 404 });
    return Response.json(coupon.toJSON());
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/db/coupons/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const coupon = await CouponModel.findByIdAndDelete(id);
    if (!coupon) return Response.json({ error: 'Coupon not found' }, { status: 404 });
    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
