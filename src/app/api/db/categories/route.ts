import { connectDB } from '@/lib/mongoose';
import { CategoryModel } from '@/models';
import { type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// Default seed categories with their fields pre-configured
const SEED_CATEGORIES = [
  {
    _id: 'tarantulas',
    name: 'Tarantulas',
    icon: '🕷️',
    sortOrder: 0,
    isActive: true,
    fields: [
      { id: 'world', label: 'World', type: 'select', options: ['New World', 'Old World'], required: true, showAsBadge: true },
      { id: 'type', label: 'Type', type: 'select', options: ['Terrestrial', 'Arboreal', 'Fossorial'], required: true, showAsBadge: true },
      { id: 'temperament', label: 'Temperament', type: 'select', options: ['docile', 'semi-aggressive', 'aggressive', 'defensive'], required: true, showAsBadge: false },
      { id: 'growthRate', label: 'Growth Rate', type: 'select', options: ['Slow', 'Medium', 'Fast'], required: false, showAsBadge: false },
      { id: 'sizeCategory', label: 'Size Category', type: 'select', options: ['Sling', 'Juvenile', 'Sub-adult', 'Adult'], required: false, showAsBadge: false },
      { id: 'gender', label: 'Gender', type: 'select', options: ['Unsexed', 'Male', 'Female', 'Pair'], required: false, showAsBadge: false },
    ],
  },
  {
    _id: 'scorpions',
    name: 'Scorpions',
    icon: '🦂',
    sortOrder: 1,
    isActive: true,
    fields: [
      { id: 'habitatType', label: 'Habitat Type', type: 'select', options: ['Desert', 'Tropical Forest'], required: true, showAsBadge: false },
      { id: 'venomPotency', label: 'Venom Potency', type: 'select', options: ['Mild', 'Moderate', 'Medically Significant', 'Lethal'], required: true, showAsBadge: true },
      { id: 'pincerType', label: 'Pincer Type', type: 'select', options: ['Thin', 'Medium', 'Thick'], required: false, showAsBadge: false },
      { id: 'communal', label: 'Communal', type: 'boolean', required: false, showAsBadge: false },
      { id: 'sizeCategory', label: 'Size Category', type: 'select', options: ['Scorpling', 'Juvenile', 'Sub-adult', 'Adult'], required: false, showAsBadge: false },
      { id: 'gender', label: 'Gender', type: 'select', options: ['Unsexed', 'Male', 'Female', 'Pair'], required: false, showAsBadge: false },
    ],
  },
  {
    _id: 'centipedes',
    name: 'Centipedes',
    icon: '🐛',
    sortOrder: 2,
    isActive: true,
    fields: [
      { id: 'habitatType', label: 'Habitat Type', type: 'select', options: ['Tropical', 'Arid'], required: true, showAsBadge: false },
      { id: 'venomPotency', label: 'Venom Potency', type: 'select', options: ['Mild', 'Moderate', 'Severe', 'Potent'], required: true, showAsBadge: true },
      { id: 'legPairs', label: 'Leg Pairs', type: 'text', required: false, showAsBadge: false },
      { id: 'sizeCategory', label: 'Size Category', type: 'select', options: ['Pedeling', 'Juvenile', 'Sub-adult', 'Adult'], required: false, showAsBadge: false },
      { id: 'gender', label: 'Gender', type: 'select', options: ['Unsexed', 'Male', 'Female'], required: false, showAsBadge: false },
    ],
  },
];

// GET /api/db/categories — fetch all categories, auto-seed if empty
export async function GET() {
  try {
    await connectDB();
    let categories = await CategoryModel.find().sort({ sortOrder: 1 });

    // Auto-seed default categories if collection is empty
    if (categories.length === 0) {
      await CategoryModel.insertMany(SEED_CATEGORIES);
      categories = await CategoryModel.find().sort({ sortOrder: 1 });
    }

    return Response.json(categories.map(c => c.toJSON()));
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/db/categories — create a new category
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const category = await CategoryModel.create({ _id: body.id, ...body });
    return Response.json(category.toJSON(), { status: 201 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
