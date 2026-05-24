import { connectDB } from '@/lib/mongoose';
import { CategoryModel, ProductModel } from '@/models';

// GET /api/db/categories/[id]
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const category = await CategoryModel.findById(id);
    if (!category) return Response.json({ error: 'Category not found' }, { status: 404 });
    return Response.json(category.toJSON());
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/db/categories/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const updates = await request.json();
    const category = await CategoryModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!category) return Response.json({ error: 'Category not found' }, { status: 404 });
    return Response.json(category.toJSON());
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/db/categories/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    // Check if any products use this category
    const productCount = await ProductModel.countDocuments({ mainCategory: id });
    if (productCount > 0) {
      return Response.json(
        { error: `Cannot delete category: ${productCount} product(s) are using it. Reassign or delete those products first.` },
        { status: 400 }
      );
    }

    const category = await CategoryModel.findByIdAndDelete(id);
    if (!category) return Response.json({ error: 'Category not found' }, { status: 404 });
    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
