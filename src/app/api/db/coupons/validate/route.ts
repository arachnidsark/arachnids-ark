import { connectDB } from '@/lib/mongoose';
import { CouponModel, ProductModel } from '@/models';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { code, userId, cartItems, subtotal } = await request.json();

    if (!code) {
      return Response.json({ valid: false, error: 'Coupon code is required' }, { status: 400 });
    }

    const uppercaseCode = code.trim().toUpperCase();
    const coupon = await CouponModel.findOne({ code: uppercaseCode });

    if (!coupon) {
      return Response.json({ valid: false, error: 'Invalid coupon code' });
    }

    if (!coupon.isActive) {
      return Response.json({ valid: false, error: 'This coupon is currently inactive' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (todayStr < coupon.validFrom) {
      return Response.json({ valid: false, error: 'Coupon is not active yet' });
    }
    if (todayStr > coupon.validUntil) {
      return Response.json({ valid: false, error: 'Coupon has expired' });
    }

    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return Response.json({ valid: false, error: 'Coupon usage limit has been reached' });
    }

    if (coupon.maxUsesPerUser > 0 && userId) {
      const userUses = coupon.usedBy.filter((id: string) => id === userId).length;
      if (userUses >= coupon.maxUsesPerUser) {
        return Response.json({ valid: false, error: 'You have already used this coupon' });
      }
    }

    if (subtotal < coupon.minOrderValue) {
      return Response.json({ valid: false, error: `Minimum order value of ₹${coupon.minOrderValue} required` });
    }

    // Filter qualifying items based on `applicableTo` and `applicableCategories`
    let qualifyingSubtotal = 0;
    let qualifyingQuantity = 0;
    let hasQualifyingItem = false;

    // Fetch product details for category restriction verification
    const productIds = cartItems
      .filter((item: any) => item.type === 'product')
      .map((item: any) => item.id);

    const dbProducts = productIds.length > 0 
      ? await ProductModel.find({ _id: { $in: productIds } }) 
      : [];
    const productCategoryMap = new Map<string, string>();
    dbProducts.forEach(p => {
      productCategoryMap.set(p._id.toString(), p.mainCategory);
    });

    for (const item of cartItems) {
      let qualifies = true;

      // Check exclusions first
      if (item.type === 'product' && coupon.excludedProductIds?.includes(item.id)) qualifies = false;
      if (item.type === 'course' && coupon.excludedCourseIds?.includes(item.id)) qualifies = false;
      if (item.type === 'consultation' && coupon.excludedConsultationIds?.includes(item.id)) qualifies = false;

      if (qualifies && coupon.applicableTo !== 'all') {
        if (item.type !== coupon.applicableTo) {
          qualifies = false;
        }
      }

      if (qualifies && item.type === 'product' && coupon.applicableCategories && coupon.applicableCategories.length > 0) {
        const prodCategory = productCategoryMap.get(item.id);
        if (!prodCategory || !coupon.applicableCategories.includes(prodCategory)) {
          qualifies = false;
        }
      }

      if (qualifies) {
        qualifyingSubtotal += item.price * item.quantity;
        qualifyingQuantity += item.quantity;
        hasQualifyingItem = true;
      }
    }

    if (!hasQualifyingItem) {
      return Response.json({ valid: false, error: 'Coupon is not applicable to the items in your cart' });
    }

    // Calculate discount amount
    let discountAmount = 0;
    const qd = coupon.quantityDiscount;
    
    // Check if quantity discount is enabled and criteria met
    if (qd && qd.enabled && qualifyingQuantity >= qd.minQuantity && subtotal >= qd.minOrderValue) {
      if (qd.discountType === 'percentage') {
        discountAmount = Math.round((qualifyingSubtotal * qd.discountValue) / 100);
      } else {
        discountAmount = Math.min(qd.discountValue * qualifyingQuantity, qualifyingSubtotal);
      }
    } else {
      // Normal discount
      if (coupon.discountType === 'percentage') {
        discountAmount = Math.round((qualifyingSubtotal * coupon.discountValue) / 100);
        if (coupon.maxDiscount !== null && coupon.maxDiscount > 0) {
          discountAmount = Math.min(discountAmount, coupon.maxDiscount);
        }
      } else {
        discountAmount = Math.min(coupon.discountValue, qualifyingSubtotal);
      }
    }

    return Response.json({
      valid: true,
      discountAmount,
      coupon: coupon.toJSON()
    });

  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
