'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import { Plus, Search, Trash2, Bug, Package, Eye, EyeOff, Pencil, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/shared/atoms/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/shared/molecules/modal';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TableMolecule } from '@/components/shared/molecules/table';
import { SectionHeader } from '@/components/shared/molecules/section-header';
import { TabMolecule, type TabOption } from '@/components/shared/molecules/tabs';
import { FormBuilder, type FormFieldConfig } from '@/components/shared/organisms/form-builder';
import { getProxiedImageUrl } from '@/lib/utils';
import { FormArray } from '@/components/shared/molecules/form-array';
import { Loading } from '@/components/shared/molecules/loading';
import { ProductSchema, type ProductSchemaType } from '@/schemas/product';
import { Db } from '@/lib/db';
import { formatPrice } from '@/constants/pricing';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { Product, MainCategory, CareLevel, Category, CategoryField } from '@/types';

const CARE_LEVELS = [
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
  { label: 'Expert', value: 'expert' },
];

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mainCategory, setMainCategory] = useState<string>('All');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Custom meta state managed separately from FormBuilder
  const [customMeta, setCustomMeta] = useState<Record<string, any>>({});

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const [prods, cats] = await Promise.all([
        Db.getAll<Product>('products'),
        Db.getAll<Category>('categories'),
      ]);
      setProducts(prods);
      setCategories(cats);
      setTimeout(() => setIsLoading(false), 300);
    })();
  }, []);

  // Build dynamic category tabs from DB
  const CATEGORIES: TabOption[] = useMemo(() => {
    const tabs: TabOption[] = [{ value: 'All', label: 'All' }];
    categories
      .filter(c => c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach(c => tabs.push({ value: c.name, label: c.name }));
    return tabs;
  }, [categories]);

  // Also include inactive for select dropdown in form
  const ALL_CATEGORY_OPTIONS: TabOption[] = useMemo(() => {
    return categories
      .filter(c => c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(c => ({ value: c.name, label: c.name }));
  }, [categories]);

  const filtered = products.filter(p =>
    (mainCategory === 'All' || p.mainCategory === mainCategory) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.scientificName?.toLowerCase().includes(search.toLowerCase()))
  );

  // Get current category definition for form rendering
  const getSelectedCategory = (categoryName: string): Category | undefined => {
    return categories.find(c => c.name === categoryName);
  };

  // Build initial custom meta values from a category definition
  const buildDefaultCustomMeta = (category: Category | undefined): Record<string, any> => {
    if (!category) return {};
    const meta: Record<string, any> = {};
    category.fields.forEach(field => {
      switch (field.type) {
        case 'boolean': meta[field.id] = false; break;
        case 'number': meta[field.id] = 0; break;
        case 'multi-select': meta[field.id] = []; break;
        default: meta[field.id] = '';
      }
    });
    return meta;
  };

  // Extract custom meta from legacy fields for existing products
  const extractCustomMeta = (product: Product): Record<string, any> => {
    // If product already has customMeta, use it
    if (product.customMeta && Object.keys(product.customMeta).length > 0) {
      return { ...product.customMeta };
    }
    // Otherwise, extract from legacy meta fields
    if (product.mainCategory === 'Tarantulas' && product.tarantulaMeta) {
      return { ...product.tarantulaMeta };
    }
    if (product.mainCategory === 'Scorpions' && product.scorpionMeta) {
      return { ...product.scorpionMeta };
    }
    if (product.mainCategory === 'Centipedes' && product.centipedeMeta) {
      return { ...product.centipedeMeta };
    }
    return {};
  };

  const initialValues: Partial<ProductSchemaType> = {
    name: '', scientificName: '', description: '', images: [],
    mainCategory: ALL_CATEGORY_OPTIONS[0]?.value || '',
    careLevel: 'beginner',
    humidity: '', temperature: '', feeding: '',
    isVisible: true, available: true,
    sizes: [{ size: '', price: 0, stock: 0 }],
  };

  const productFields: FormFieldConfig<ProductSchemaType>[] = [
    { name: 'name', label: 'Name', type: 'text', gridSpan: 'md:col-span-1' },
    { name: 'scientificName', label: 'Scientific Name', type: 'text', gridSpan: 'md:col-span-1' },
    { name: 'mainCategory', label: 'Main Category', type: 'select', options: ALL_CATEGORY_OPTIONS, gridSpan: 'md:col-span-1' },
    { name: 'careLevel', label: 'Care Level', type: 'select', options: CARE_LEVELS, gridSpan: 'md:col-span-1' },
    { name: 'description', label: 'Description', type: 'textarea', gridSpan: 'md:col-span-2' },
    { name: 'humidity', label: 'Humidity', type: 'text', gridSpan: 'md:col-span-1' },
    { name: 'temperature', label: 'Temperature', type: 'text', gridSpan: 'md:col-span-1' },
    { name: 'feeding', label: 'Feeding', type: 'text', gridSpan: 'md:col-span-2' },
  ];

  const handleToggle = async (id: string, field: 'isVisible' | 'available') => {
    const product = products.find(p => p.id === id);
    if (product) {
      const updated = { ...product, [field]: !product[field] };
      await Db.update('products', id, updated);
      setProducts(await Db.getAll<Product>('products'));
      toast.success('Status updated');
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await Db.delete('products', deleteId);
      setDeleteId(null);
      setIsLoading(true);
      setProducts(await Db.getAll<Product>('products'));
      setTimeout(() => setIsLoading(false), 300);
      toast.success('Product deleted');
    }
  };

  const handleFormSubmit = async (data: ProductSchemaType) => {
    // Build legacy fields for backwards compatibility
    let legacyFields: Partial<Product> = {};
    const category = getSelectedCategory(data.mainCategory);

    // If it's one of the legacy categories, still populate legacy fields
    if (data.mainCategory === 'Tarantulas' && customMeta) {
      legacyFields = {
        tarantulaMeta: {
          world: customMeta.world || 'New World',
          type: customMeta.type || 'Terrestrial',
          temperament: customMeta.temperament || 'docile',
          growthRate: customMeta.growthRate,
          sizeCategory: customMeta.sizeCategory,
          gender: customMeta.gender,
        },
        category: customMeta.type?.toLowerCase() as any,
        origin: customMeta.world === 'New World' ? 'new-world' : 'old-world',
        temperament: customMeta.temperament,
      };
    } else if (data.mainCategory === 'Scorpions' && customMeta) {
      legacyFields = {
        scorpionMeta: {
          habitatType: customMeta.habitatType || 'Desert',
          venomPotency: customMeta.venomPotency || 'Mild',
          pincerType: customMeta.pincerType || 'Medium',
          communal: customMeta.communal || false,
          sizeCategory: customMeta.sizeCategory,
          gender: customMeta.gender,
        },
      };
    } else if (data.mainCategory === 'Centipedes' && customMeta) {
      legacyFields = {
        centipedeMeta: {
          habitatType: customMeta.habitatType || 'Tropical',
          venomPotency: customMeta.venomPotency || 'Moderate',
          legPairs: customMeta.legPairs,
          sizeCategory: customMeta.sizeCategory,
          gender: customMeta.gender,
        },
      };
    }

    if (editingProduct) {
      const updated = {
        ...editingProduct, ...data, ...legacyFields,
        customMeta,
        updatedAt: new Date().toISOString(),
      };
      await Db.update('products', editingProduct.id, updated);
      toast.success('Product updated');
    } else {
      const newItem = {
        ...data, ...legacyFields,
        customMeta,
        id: `prod-${Date.now()}`, featured: false,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        likes: 0
      };
      await Db.create('products', newItem);
      toast.success('Product added');
    }
    setIsProductModalOpen(false);
    setIsLoading(true);
    setProducts(await Db.getAll<Product>('products'));
    setTimeout(() => setIsLoading(false), 300);
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    const defaultCat = getSelectedCategory(ALL_CATEGORY_OPTIONS[0]?.value || '');
    setCustomMeta(buildDefaultCustomMeta(defaultCat));
    setIsProductModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setCustomMeta(extractCustomMeta(product));
    setIsProductModalOpen(true);
  };

  // Render custom meta fields based on category definition
  const renderCustomMetaFields = (categoryName: string) => {
    const category = getSelectedCategory(categoryName);
    if (!category || category.fields.length === 0) return null;

    return (
      <div className="space-y-4 pt-4 border-t border-border/50">
        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-gold ml-1">
          {category.name} Details
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {category.fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label className="text-xs">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </Label>
              {renderFieldInput(field)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderFieldInput = (field: CategoryField) => {
    const value = customMeta[field.id];
    switch (field.type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => setCustomMeta({ ...customMeta, [field.id]: e.target.value })}
            className="bg-background/50 h-9"
            placeholder={field.label}
          />
        );
      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => setCustomMeta({ ...customMeta, [field.id]: e.target.value })}
            className="bg-background/50 min-h-[80px]"
            placeholder={field.label}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={value ?? ''}
            onChange={(e) => setCustomMeta({ ...customMeta, [field.id]: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
            className="bg-background/50 h-9"
            placeholder={field.label}
          />
        );
      case 'boolean':
        return (
          <div className="flex items-center gap-2 h-9">
            <Switch
              checked={!!value}
              onCheckedChange={(checked) => setCustomMeta({ ...customMeta, [field.id]: checked })}
            />
            <span className="text-xs text-muted-foreground">{value ? 'Yes' : 'No'}</span>
          </div>
        );
      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => setCustomMeta({ ...customMeta, [field.id]: e.target.value })}
            className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          >
            <option value="">Select {field.label}...</option>
            {(field.options || []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'multi-select':
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {(Array.isArray(value) ? value : []).map((v: string) => (
                <Badge
                  key={v}
                  variant="outline"
                  className="text-[10px] border-border bg-card/50 gap-1 cursor-pointer"
                  onClick={() => {
                    setCustomMeta({
                      ...customMeta,
                      [field.id]: (value as string[]).filter((x: string) => x !== v),
                    });
                  }}
                >
                  {v} ×
                </Badge>
              ))}
            </div>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value && !(Array.isArray(value) ? value : []).includes(e.target.value)) {
                  setCustomMeta({
                    ...customMeta,
                    [field.id]: [...(Array.isArray(value) ? value : []), e.target.value],
                  });
                }
              }}
              className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            >
              <option value="">Add {field.label}...</option>
              {(field.options || [])
                .filter(opt => !(Array.isArray(value) ? value : []).includes(opt))
                .map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return <Loading text="Fetching inventory..." />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        action={{
          label: "Add Product",
          onClick: openCreateModal,
          icon: Plus
        }}
      >
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center w-full md:w-auto">
          <div className="w-full md:w-80">
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-card border-border h-10"
              startContent={<Search className="h-4 w-4 text-muted-foreground" />}
              isClearable
              onClear={() => setSearch('')}
            />
          </div>
          <TabMolecule
            options={CATEGORIES}
            value={mainCategory}
            onValueChange={setMainCategory}
            className="w-full md:w-auto"
          />
        </div>
      </SectionHeader>

      <TableMolecule
        data={filtered}
        columns={[
          {
            header: 'Name',
            cell: (product) => (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-muted overflow-hidden border border-border">
                  {product.images?.[0] ? <img src={getProxiedImageUrl(product.images[0])} referrerPolicy="no-referrer" alt="" className="w-full h-full object-cover" /> : <Bug className="m-auto h-4 w-4 opacity-20" />}
                </div>
                <div>
                  <div className="font-medium">{product.name}</div>
                  <div className="text-xs text-muted-foreground italic">{product.scientificName}</div>
                </div>
              </div>
            )
          },
          {
            header: 'Attributes',
            cell: (product) => (
              <div className="flex flex-col gap-1">
                <Badge variant="outline" className="w-fit text-[9px] uppercase">{product.mainCategory}</Badge>
                <span className="text-[10px] text-muted-foreground">{product.careLevel} Care</span>
              </div>
            )
          },
          {
            header: 'Price/Stock',
            cell: (product) => (
              <div className="flex flex-col gap-1">
                {product.sizes?.map((s, i) => (
                  <div key={i} className="text-[10px]"><span className="text-muted-foreground">{s.size}:</span> <span className="font-bold">{formatPrice(s.price)}</span> ({s.stock})</div>
                ))}
              </div>
            )
          },
          {
            header: 'Status',
            cell: (product) => (
              <div className="flex gap-1.5">
                <Badge variant="outline" className={product.isVisible ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-gray-500/10 text-gray-400"}>{product.isVisible ? 'Visible' : 'Hidden'}</Badge>
                <Badge variant="outline" className={product.available ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400"}>{product.available ? 'In Stock' : 'Out'}</Badge>
              </div>
            )
          },
          {
            header: 'Actions',
            align: 'right',
            cell: (product) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggle(product.id, 'isVisible')}><Eye className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(product)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-400" onClick={() => handleDelete(product.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            )
          }
        ]}
        emptyDescription="No products found."
      />

      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        variant="extra-large"
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
      >

        <FormBuilder
          schema={ProductSchema}
          defaultValues={editingProduct ? {
            ...initialValues,
            ...editingProduct,
          } : initialValues}
          fields={productFields}
          onSubmit={handleFormSubmit}
          submitLabel={editingProduct ? 'Save Changes' : 'Create Product'}
          submitAlignment="right"
        >
          {({ watch }: { watch: any }) => {
            const selectedCategoryName = watch('mainCategory');
            return (
              <div className="space-y-6">
                {/* Dynamic custom meta fields based on selected category */}
                {renderCustomMetaFields(selectedCategoryName)}

                <FormArray
                  name="sizes"
                  label="Product Sizes & Stock"
                  newItemDefault={{ size: '', price: 0, stock: 0 }}
                  fields={[
                    { name: 'size', label: 'Size', type: 'text' },
                    { name: 'price', label: 'Price', type: 'number' },
                    { name: 'stock', label: 'Stock', type: 'number' }
                  ]}
                />

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-gold ml-1">Images (URLs)</Label>
                  <FormArray
                    name="images"
                    newItemDefault=""
                    fields={[{ name: '', label: 'URL', type: 'text', gridSpan: 'col-span-3' }]}
                  />
                </div>
              </div>
            );
          }}
        </FormBuilder>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        variant="confirm"
        title="Delete Product"
        footer={(
          <div className="flex gap-2 w-full justify-end">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete Product</Button>
          </div>
        )}
        headerClassName='!border-0'
        footerClassName='!border-0'
        className='max-w-100'
      >
        <p>Are you sure you want to delete this product? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
