'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, GripVertical, ChevronUp, ChevronDown, Tag, Eye, EyeOff, FolderTree, ToggleLeft, AlignLeft, Hash, List, ListChecks, Type } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/shared/atoms/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/shared/molecules/modal';
import { SectionHeader } from '@/components/shared/molecules/section-header';
import { Loading } from '@/components/shared/molecules/loading';
import { EmptyState } from '@/components/shared/molecules/empty-state';
import { Select as SharedSelect } from '@/components/shared/atoms/select';
import { Db } from '@/lib/db';
import type { Category, CategoryField, CategoryFieldType } from '@/types';

const FIELD_TYPES: { value: CategoryFieldType; label: string; icon: any }[] = [
  { value: 'text', label: 'Text', icon: Type },
  { value: 'textarea', label: 'Textarea', icon: AlignLeft },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'boolean', label: 'Toggle', icon: ToggleLeft },
  { value: 'select', label: 'Dropdown', icon: List },
  { value: 'multi-select', label: 'Multi-Select', icon: ListChecks },
];

const FIELD_TYPE_OPTIONS = FIELD_TYPES.map(ft => ({ value: ft.value, label: ft.label }));

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function generateFieldId(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// ========== FIELD EDITOR COMPONENT ==========
function FieldEditor({
  field,
  index,
  total,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  field: CategoryField;
  index: number;
  total: number;
  onChange: (updated: CategoryField) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [newOption, setNewOption] = useState('');
  const hasOptions = field.type === 'select' || field.type === 'multi-select';

  return (
    <div className="p-4 rounded-xl bg-background/30 border border-border space-y-4 group relative">
      {/* Header Row */}
      <div className="flex items-start gap-3">
        <div className="flex flex-col gap-1 pt-1">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-0.5 rounded hover:bg-accent/50 disabled:opacity-20 transition-colors"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="p-0.5 rounded hover:bg-accent/50 disabled:opacity-20 transition-colors"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px]">Label</Label>
            <Input
              value={field.label}
              onChange={(e) => onChange({ ...field, label: e.target.value, id: field.id || generateFieldId(e.target.value) })}
              placeholder="e.g. Venom Potency"
              className="bg-background/50 h-9 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Field ID</Label>
            <Input
              value={field.id}
              onChange={(e) => onChange({ ...field, id: e.target.value })}
              placeholder="auto-generated"
              className="bg-background/50 h-9 text-xs font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Type</Label>
            <SharedSelect
              options={FIELD_TYPE_OPTIONS}
              value={field.type}
              onValueChange={(val) => onChange({ ...field, type: val as CategoryFieldType })}
              className="h-9 text-xs"
            />
          </div>
        </div>

        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/5 shrink-0" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Toggles Row */}
      <div className="flex flex-wrap gap-6 pl-8">
        <div className="flex items-center gap-2">
          <Switch
            checked={field.required}
            onCheckedChange={(checked) => onChange({ ...field, required: checked })}
            className="scale-75"
          />
          <Label className="text-[10px] text-muted-foreground cursor-pointer">Required</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={field.showAsBadge}
            onCheckedChange={(checked) => onChange({ ...field, showAsBadge: checked })}
            className="scale-75"
          />
          <Label className="text-[10px] text-muted-foreground cursor-pointer">Show as Badge</Label>
        </div>
      </div>

      {/* Options (for select/multi-select) */}
      {hasOptions && (
        <div className="pl-8 space-y-2">
          <Label className="text-[10px] text-brand-gold">Options</Label>
          <div className="flex flex-wrap gap-1.5">
            {(field.options || []).map((opt, i) => (
              <Badge
                key={i}
                variant="outline"
                className="border-border bg-card/50 text-xs py-1 px-2 gap-1 group/opt"
              >
                {opt}
                <button
                  onClick={() => {
                    const newOptions = [...(field.options || [])];
                    newOptions.splice(i, 1);
                    onChange({ ...field, options: newOptions });
                  }}
                  className="ml-1 text-red-400 opacity-0 group-hover/opt:opacity-100 transition-opacity hover:text-red-300"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              placeholder="Add option..."
              className="bg-background/50 h-8 text-xs flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newOption.trim()) {
                  e.preventDefault();
                  onChange({ ...field, options: [...(field.options || []), newOption.trim()] });
                  setNewOption('');
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[10px]"
              disabled={!newOption.trim()}
              onClick={() => {
                onChange({ ...field, options: [...(field.options || []), newOption.trim()] });
                setNewOption('');
              }}
            >
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== MAIN PAGE ==========
export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formFields, setFormFields] = useState<CategoryField[]>([]);

  const loadCategories = async () => {
    setIsLoading(true);
    const data = await Db.getAll<Category>('categories');
    setCategories(data);
    setTimeout(() => setIsLoading(false), 300);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormName('');
    setFormIcon('');
    setFormActive(true);
    setFormFields([]);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormIcon(cat.icon || '');
    setFormActive(cat.isActive);
    setFormFields(cat.fields.map(f => ({ ...f })));
    setIsModalOpen(true);
  };

  const addField = () => {
    setFormFields([
      ...formFields,
      { id: '', label: '', type: 'text', required: false, showAsBadge: false },
    ]);
  };

  const updateField = (index: number, updated: CategoryField) => {
    const newFields = [...formFields];
    newFields[index] = updated;
    setFormFields(newFields);
  };

  const deleteField = (index: number) => {
    setFormFields(formFields.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...formFields];
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= newFields.length) return;
    [newFields[index], newFields[swapWith]] = [newFields[swapWith], newFields[index]];
    setFormFields(newFields);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Category name is required');
      return;
    }

    // Validate fields
    for (const field of formFields) {
      if (!field.label.trim()) {
        toast.error('All fields must have a label');
        return;
      }
      if (!field.id.trim()) {
        field.id = generateFieldId(field.label);
      }
      if ((field.type === 'select' || field.type === 'multi-select') && (!field.options || field.options.length === 0)) {
        toast.error(`Field "${field.label}" needs at least one option`);
        return;
      }
    }

    // Check for duplicate field IDs
    const fieldIds = formFields.map(f => f.id);
    const duplicates = fieldIds.filter((id, i) => fieldIds.indexOf(id) !== i);
    if (duplicates.length > 0) {
      toast.error(`Duplicate field IDs: ${duplicates.join(', ')}`);
      return;
    }

    try {
      if (editingCategory) {
        await Db.update('categories', editingCategory.id, {
          name: formName.trim(),
          icon: formIcon.trim() || undefined,
          isActive: formActive,
          fields: formFields,
        });
        toast.success('Category updated');
      } else {
        const slug = generateSlug(formName);
        // Check for duplicate
        if (categories.some(c => c.id === slug)) {
          toast.error('A category with this name already exists');
          return;
        }
        await Db.create('categories', {
          id: slug,
          name: formName.trim(),
          icon: formIcon.trim() || undefined,
          isActive: formActive,
          sortOrder: categories.length,
          fields: formFields,
        });
        toast.success('Category created');
      }
      setIsModalOpen(false);
      loadCategories();
    } catch {
      toast.error('Failed to save category');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const result = await Db.delete('categories', deleteId);
      if (!result) {
        // The API might return an error message about products
        toast.error('Cannot delete this category — products are still using it.');
      } else {
        toast.success('Category deleted');
      }
      setDeleteId(null);
      loadCategories();
    } catch {
      toast.error('Failed to delete category');
      setDeleteId(null);
    }
  };

  const handleToggleActive = async (cat: Category) => {
    await Db.update('categories', cat.id, { isActive: !cat.isActive });
    toast.success(`${cat.name} ${!cat.isActive ? 'activated' : 'deactivated'}`);
    loadCategories();
  };

  if (isLoading) {
    return <Loading text="Fetching categories..." />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        action={{
          label: "Add Category",
          onClick: openCreateModal,
          icon: Plus,
        }}
      />

      {categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Create your first product category to get started."
          action={{ label: 'Create Category', onClick: openCreateModal }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Card key={cat.id} className={`border-border bg-card/40 backdrop-blur-sm transition-all hover:border-brand-gold/20 ${!cat.isActive ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-gold/10 flex items-center justify-center text-lg">
                      {cat.icon || <FolderTree className="h-5 w-5 text-brand-gold" />}
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold uppercase tracking-wider">{cat.name}</CardTitle>
                      <CardDescription className="text-[10px] font-mono">{cat.id}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className={cat.isActive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-gray-500/10 text-gray-400'}>
                    {cat.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Fields summary */}
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                    {cat.fields.length} Custom Field{cat.fields.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {cat.fields.map((field) => {
                      const fieldType = FIELD_TYPES.find(ft => ft.value === field.type);
                      const Icon = fieldType?.icon || Tag;
                      return (
                        <Badge
                          key={field.id}
                          variant="outline"
                          className="text-[9px] border-border bg-background/50 gap-1 py-0.5"
                        >
                          <Icon className="h-2.5 w-2.5" />
                          {field.label}
                          {field.required && <span className="text-red-400">*</span>}
                          {field.showAsBadge && <Eye className="h-2 w-2 text-brand-gold" />}
                        </Badge>
                      );
                    })}
                    {cat.fields.length === 0 && (
                      <span className="text-[10px] text-muted-foreground italic">No fields defined</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                  <Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase tracking-wider flex-1" onClick={() => openEditModal(cat)}>
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase tracking-wider flex-1" onClick={() => handleToggleActive(cat)}>
                    {cat.isActive ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                    {cat.isActive ? 'Disable' : 'Enable'}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-400/5" onClick={() => setDeleteId(cat.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        variant="extra-large"
        title={editingCategory ? `Edit: ${editingCategory.name}` : 'Create New Category'}
      >
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-gold ml-1">Category Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Mantises"
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-gold ml-1">Icon (emoji)</Label>
              <Input
                value={formIcon}
                onChange={(e) => setFormIcon(e.target.value)}
                placeholder="🦗"
                className="bg-background/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={formActive} onCheckedChange={setFormActive} />
            <Label className="text-sm">Active</Label>
          </div>

          {/* Fields Builder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-gold">Custom Fields</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">Define the metadata fields products in this category must fill.</p>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase tracking-widest" onClick={addField}>
                <Plus className="h-3 w-3 mr-1" /> Add Field
              </Button>
            </div>

            {formFields.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-xl bg-accent/5">
                <Tag className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No custom fields yet.</p>
                <p className="text-xs text-muted-foreground">Click "Add Field" to define product attributes for this category.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {formFields.map((field, i) => (
                  <FieldEditor
                    key={i}
                    field={field}
                    index={i}
                    total={formFields.length}
                    onChange={(updated) => updateField(i, updated)}
                    onDelete={() => deleteField(i)}
                    onMoveUp={() => moveField(i, 'up')}
                    onMoveDown={() => moveField(i, 'down')}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Save */}
          <div className="flex justify-end pt-4 border-t border-border/50">
            <Button onClick={handleSave} className="bg-brand-red hover:bg-brand-red-light text-white font-bold px-8 uppercase tracking-widest text-xs">
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        variant="confirm"
        title="Delete Category"
        footer={(
          <div className="flex gap-2 w-full justify-end">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete Category</Button>
          </div>
        )}
        headerClassName="!border-0"
        footerClassName="!border-0"
        className="max-w-100"
      >
        <p>Are you sure you want to delete this category? This action cannot be undone.</p>
        <p className="text-sm text-muted-foreground mt-2">Note: You cannot delete a category if products are still assigned to it.</p>
      </Modal>
    </div>
  );
}
