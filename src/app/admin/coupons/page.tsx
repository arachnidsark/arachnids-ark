'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Ticket, Percent, DollarSign, Calendar, Save, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/shared/atoms/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { TableMolecule } from '@/components/shared/molecules/table';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/shared/molecules/modal';
import { Db } from '@/lib/db';
import type { Coupon, DiscountType, CouponApplicableTo } from '@/types';
import { SectionHeader } from '@/components/shared/molecules/section-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPrice } from '@/constants/pricing';
import { Loading } from '@/components/shared/molecules/loading';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Coupon>>({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: 0,
    minOrderValue: 0,
    maxDiscount: null,
    maxUses: 0,
    maxUsesPerUser: 1,
    validFrom: '',
    validUntil: '',
    isActive: true,
    applicableTo: 'all',
    applicableCategories: [],
    autoApply: false,
  });

  const [categoriesSelected, setCategoriesSelected] = useState<Record<string, boolean>>({
    Tarantulas: false,
    Scorpions: false,
    Centipedes: false,
  });

  useEffect(() => {
    (async () => {
      setCoupons(await Db.getAll<Coupon>('coupons'));
      setIsFetching(false);
    })();
  }, []);

  useEffect(() => {
    if (formData.applicableCategories) {
      setCategoriesSelected({
        Tarantulas: formData.applicableCategories.includes('Tarantulas'),
        Scorpions: formData.applicableCategories.includes('Scorpions'),
        Centipedes: formData.applicableCategories.includes('Centipedes'),
      });
    } else {
      setCategoriesSelected({ Tarantulas: false, Scorpions: false, Centipedes: false });
    }
  }, [formData.applicableCategories]);

  const filtered = coupons.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenEdit = (coupon: Coupon | null) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultExpiry = new Date();
    defaultExpiry.setMonth(defaultExpiry.getMonth() + 1);
    const expiryStr = defaultExpiry.toISOString().split('T')[0];

    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({ ...coupon });
    } else {
      setEditingCoupon(null);
      setFormData({
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: 10,
        minOrderValue: 0,
        maxDiscount: null,
        maxUses: 0,
        maxUsesPerUser: 1,
        validFrom: todayStr,
        validUntil: expiryStr,
        isActive: true,
        applicableTo: 'all',
        applicableCategories: [],
        autoApply: false,
      });
    }
    setIsModalOpen(true);
  };

  const handleCategoryCheckboxChange = (cat: string, checked: boolean) => {
    const currentList = formData.applicableCategories || [];
    let newList: string[] = [];
    if (checked) {
      newList = [...currentList, cat];
    } else {
      newList = currentList.filter(c => c !== cat);
    }
    setFormData({ ...formData, applicableCategories: newList });
  };

  const handleSave = async () => {
    if (!formData.code || !formData.code.trim()) {
      toast.error('Coupon code is required');
      return;
    }
    if (!formData.discountValue || formData.discountValue <= 0) {
      toast.error('Discount value must be greater than 0');
      return;
    }
    if (!formData.validFrom || !formData.validUntil) {
      toast.error('Validity dates are required');
      return;
    }
    if (formData.validUntil < formData.validFrom) {
      toast.error('Expiry date cannot be before activation date');
      return;
    }

    setLoading(true);
    const codeUpper = formData.code.trim().toUpperCase();

    // Check code uniqueness (only on create)
    if (!editingCoupon) {
      const exists = coupons.some(c => c.code.toUpperCase() === codeUpper);
      if (exists) {
        toast.error(`Coupon code ${codeUpper} already exists!`);
        setLoading(false);
        return;
      }
    }

    const payload = {
      ...formData,
      code: codeUpper,
      maxDiscount: formData.discountType === 'flat' ? null : (formData.maxDiscount ? Number(formData.maxDiscount) : null),
      discountValue: Number(formData.discountValue),
      minOrderValue: Number(formData.minOrderValue),
      maxUses: Number(formData.maxUses),
      maxUsesPerUser: Number(formData.maxUsesPerUser),
      applicableCategories: formData.applicableTo === 'products' ? (formData.applicableCategories || []) : [],
    };

    if (editingCoupon) {
      const updated = { ...editingCoupon, ...payload } as Coupon;
      await Db.update('coupons', updated.id, updated);
      toast.success('Coupon updated successfully');
    } else {
      const newCoupon = {
        ...payload,
        id: `coupon-${Date.now()}`,
        usedCount: 0,
        usedBy: [],
      } as Coupon;
      await Db.create('coupons', newCoupon);
      toast.success('Coupon created successfully');
    }

    setCoupons(await Db.getAll<Coupon>('coupons'));
    setIsModalOpen(false);
    setLoading(false);
  };

  const handleToggleActive = async (coupon: Coupon) => {
    const updated = { ...coupon, isActive: !coupon.isActive };
    await Db.update('coupons', coupon.id, { isActive: !coupon.isActive });
    setCoupons(coupons.map(c => c.id === coupon.id ? updated : c));
    toast.success(`Coupon ${coupon.code} ${!coupon.isActive ? 'activated' : 'deactivated'}`);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await Db.delete('coupons', deleteId);
      setCoupons(coupons.filter(c => c.id !== deleteId));
      setDeleteId(null);
      toast.success('Coupon deleted');
    }
  };

  const getStatusBadge = (coupon: Coupon) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (!coupon.isActive) {
      return <Badge variant="outline" className="bg-red-500/10 border-red-500/20 text-red-500 uppercase text-[9px] font-bold">Inactive</Badge>;
    }
    if (todayStr > coupon.validUntil) {
      return <Badge variant="outline" className="bg-red-500/10 border-red-500/20 text-red-500 uppercase text-[9px] font-bold">Expired</Badge>;
    }
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return <Badge variant="outline" className="bg-amber-500/10 border-amber-500/20 text-amber-500 uppercase text-[9px] font-bold">Depleted</Badge>;
    }
    return <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/20 text-emerald-500 uppercase text-[9px] font-bold">Active</Badge>;
  };

  if (isFetching) {
    return <Loading text="Loading coupons..." />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        className="justify-end"
        action={{
          label: "Create Coupon",
          onClick: () => handleOpenEdit(null),
          icon: Plus,
          variant: 'primary'
        }}
      >
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search coupons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-card border-border h-10"
            startContent={<Search className="h-4 w-4 text-muted-foreground" />}
            isClearable
            onClear={() => setSearch('')}
          />
        </div>
      </SectionHeader>

      <TableMolecule
        data={filtered}
        columns={[
          {
            header: 'Coupon Code',
            cell: (coupon) => (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
                  <Ticket className="h-5 w-5 text-brand-gold" />
                </div>
                <div>
                  <div className="font-mono font-bold text-sm tracking-wide text-brand-gold">{coupon.code}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{coupon.description || 'No description'}</div>
                </div>
              </div>
            )
          },
          {
            header: 'Type & Value',
            cell: (coupon) => (
              <div>
                <span className="font-bold text-xs uppercase text-foreground">
                  {coupon.discountType === 'percentage' ? `${coupon.discountValue}% Off` : `${formatPrice(coupon.discountValue)} Off`}
                </span>
                {coupon.discountType === 'percentage' && coupon.maxDiscount && (
                  <span className="text-[10px] text-muted-foreground block font-medium">Capped at {formatPrice(coupon.maxDiscount)}</span>
                )}
              </div>
            )
          },
          {
            header: 'Applicable To',
            cell: (coupon) => (
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">{coupon.applicableTo}</span>
                {coupon.applicableTo === 'products' && coupon.applicableCategories.length > 0 && (
                  <span className="text-[10px] text-brand-gold font-medium block">({coupon.applicableCategories.join(', ')})</span>
                )}
              </div>
            )
          },
          {
            header: 'Uses',
            cell: (coupon) => (
              <div className="text-xs">
                <span className="font-bold">{coupon.usedCount}</span>
                <span className="text-muted-foreground"> / {coupon.maxUses === 0 ? '∞' : coupon.maxUses}</span>
              </div>
            )
          },
          {
            header: 'Validity Period',
            cell: (coupon) => (
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <div className="flex items-center gap-1 font-mono"><Calendar className="h-3 w-3" /> {coupon.validFrom}</div>
                <div className="flex items-center gap-1 font-mono text-red-400"><Calendar className="h-3 w-3" /> {coupon.validUntil}</div>
              </div>
            )
          },
          {
            header: 'Status',
            cell: (coupon) => getStatusBadge(coupon)
          },
          {
            header: 'Quick Toggle',
            cell: (coupon) => (
              <Switch
                checked={coupon.isActive}
                onCheckedChange={() => handleToggleActive(coupon)}
              />
            )
          },
          {
            header: 'Actions',
            align: 'right',
            cell: (coupon) => (
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-brand-gold" onClick={() => handleOpenEdit(coupon)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400" onClick={() => setDeleteId(coupon.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )
          }
        ]}
        emptyDescription="No discount coupons found. Click 'Create Coupon' to get started."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        variant="extra-large"
        title={editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create Discount Coupon'}
      >
        <div className="space-y-6">
          <div className="space-y-4 py-4 max-h-[80vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-brand-gold uppercase tracking-widest text-[10px] font-bold">Coupon Code *</Label>
                <Input
                  id="code"
                  value={formData.code || ''}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="bg-background/50 font-mono font-bold tracking-wider"
                  placeholder="e.g. WELCOME20"
                  disabled={!!editingCoupon}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-brand-gold uppercase tracking-widest text-[10px] font-bold">Short Description</Label>
                <Input
                  id="description"
                  value={formData.description || ''}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="bg-background/50"
                  placeholder="e.g. 20% off for first order"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="space-y-2">
                <Label className="text-brand-gold uppercase tracking-widest text-[10px] font-bold">Discount Type *</Label>
                <Select
                  value={formData.discountType}
                  onValueChange={(val) => setFormData({ ...formData, discountType: val as DiscountType })}
                >
                  <SelectTrigger className="bg-background/50 h-10 border-border">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="glass border-border">
                    <SelectItem value="percentage" className="font-bold">Percentage (%)</SelectItem>
                    <SelectItem value="flat" className="font-bold">Flat Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountValue" className="text-brand-gold uppercase tracking-widest text-[10px] font-bold">Discount Value *</Label>
                <div className="relative">
                  <Input
                    id="discountValue"
                    type="number"
                    value={formData.discountValue || ''}
                    onChange={e => setFormData({ ...formData, discountValue: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="bg-background/50 pr-8"
                    placeholder="e.g. 10"
                  />
                  <div className="absolute right-3 top-3 text-muted-foreground text-xs font-bold pointer-events-none">
                    {formData.discountType === 'percentage' ? '%' : '₹'}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minOrderValue" className="text-brand-gold uppercase tracking-widest text-[10px] font-bold">Min Order Value (₹)</Label>
                <div className="relative">
                  <Input
                    id="minOrderValue"
                    type="number"
                    value={formData.minOrderValue || ''}
                    onChange={e => setFormData({ ...formData, minOrderValue: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="bg-background/50 pr-8"
                    placeholder="0 = No Minimum"
                  />
                  <div className="absolute right-3 top-3 text-muted-foreground text-xs font-bold pointer-events-none">₹</div>
                </div>
              </div>
            </div>

            {formData.discountType === 'percentage' && (
              <div className="space-y-2 pt-2">
                <Label htmlFor="maxDiscount" className="text-brand-gold uppercase tracking-widest text-[10px] font-bold">Max Discount Cap (₹)</Label>
                <div className="relative">
                  <Input
                    id="maxDiscount"
                    type="number"
                    value={formData.maxDiscount || ''}
                    onChange={e => setFormData({ ...formData, maxDiscount: e.target.value === '' ? null : Number(e.target.value) })}
                    className="bg-background/50"
                    placeholder="Leave empty for unlimited cap"
                  />
                  <div className="absolute right-3 top-3 text-muted-foreground text-xs font-bold pointer-events-none">₹</div>
                </div>
                <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                  <Info className="h-3 w-3" /> Caps the total discount amount (e.g. 20% off up to ₹500).
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <Label htmlFor="maxUses" className="text-brand-gold uppercase tracking-widest text-[10px] font-bold">Max Total Uses Globally</Label>
                <Input
                  id="maxUses"
                  type="number"
                  value={formData.maxUses || ''}
                  onChange={e => setFormData({ ...formData, maxUses: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="bg-background/50"
                  placeholder="0 = Unlimited Uses"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxUsesPerUser" className="text-brand-gold uppercase tracking-widest text-[10px] font-bold">Max Uses Per Customer</Label>
                <Input
                  id="maxUsesPerUser"
                  type="number"
                  value={formData.maxUsesPerUser || ''}
                  onChange={e => setFormData({ ...formData, maxUsesPerUser: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="bg-background/50"
                  placeholder="0 = Unlimited"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <Label htmlFor="validFrom" className="text-brand-gold uppercase tracking-widest text-[10px] font-bold">Valid From *</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={formData.validFrom || ''}
                  onChange={e => setFormData({ ...formData, validFrom: e.target.value })}
                  className="bg-background/50 h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="validUntil" className="text-brand-gold uppercase tracking-widest text-[10px] font-bold">Valid Until *</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={formData.validUntil || ''}
                  onChange={e => setFormData({ ...formData, validUntil: e.target.value })}
                  className="bg-background/50 h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/40">
              <div className="space-y-2">
                <Label className="text-brand-gold uppercase tracking-widest text-[10px] font-bold">Applicability restriction</Label>
                <Select
                  value={formData.applicableTo}
                  onValueChange={(val) => setFormData({ ...formData, applicableTo: val as CouponApplicableTo })}
                >
                  <SelectTrigger className="bg-background/50 h-10 border-border">
                    <SelectValue placeholder="Apply to..." />
                  </SelectTrigger>
                  <SelectContent className="glass border-border">
                    <SelectItem value="all" className="font-bold">Apply to All Items</SelectItem>
                    <SelectItem value="products" className="font-bold">Products Only</SelectItem>
                    <SelectItem value="courses" className="font-bold">Courses Only</SelectItem>
                    <SelectItem value="consultations" className="font-bold">Consultations Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.applicableTo === 'products' && (
                <div className="space-y-2">
                  <Label className="text-brand-gold uppercase tracking-widest text-[10px] font-bold block mb-1">Product Categories</Label>
                  <div className="flex gap-4 p-2 rounded-lg bg-background/20 border border-border/30 h-10 items-center">
                    {['Tarantulas', 'Scorpions', 'Centipedes'].map((cat) => (
                      <label key={cat} className="flex items-center gap-2 text-xs font-bold uppercase cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={categoriesSelected[cat] || false}
                          onChange={(e) => handleCategoryCheckboxChange(cat, e.target.checked)}
                          className="rounded border-border text-brand-gold focus:ring-brand-gold"
                        />
                        {cat}
                      </label>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">If none selected, it applies to all product categories.</p>
                </div>
              )}
            </div>

            <div className="flex gap-8 pt-4 border-t border-border/40">
              <div className="flex items-center gap-3">
                <Switch
                  id="autoApply"
                  checked={formData.autoApply}
                  onCheckedChange={(checked) => setFormData({ ...formData, autoApply: checked })}
                />
                <div className="space-y-0.5">
                  <Label htmlFor="autoApply" className="text-xs font-bold uppercase cursor-pointer">Auto-Apply Coupon</Label>
                  <p className="text-[9px] text-muted-foreground italic leading-tight">Apply automatically at checkout if rules are met.</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <div className="space-y-0.5">
                  <Label htmlFor="isActive" className="text-xs font-bold uppercase cursor-pointer">Coupon Active</Label>
                  <p className="text-[9px] text-muted-foreground italic leading-tight">Enable or disable manual user entries.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-border/50">
              <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={loading} className="bg-brand-red hover:bg-brand-red-light text-white px-8">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {editingCoupon ? 'Save Changes' : 'Create Coupon'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        variant="confirm"
        title="Confirm Deletion"
        className='!max-w-100'
        headerClassName='!border-0'
        footerClassName='!border-0'
        footer={(
          <div className="flex gap-2 w-full justify-end">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </div>
        )}
      >
        <p>Are you sure you want to delete this discount coupon? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
