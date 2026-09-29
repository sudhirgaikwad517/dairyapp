import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Package, ArrowLeft, Save, RotateCcw, Plus, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

const PRODUCT_TYPES = ['Liquid', 'Solid', 'Powder', 'Other'];

/// Must stay in sync with PRODUCT_BADGES in the backend's ProductService —
/// the app styles each tag, so anything else is dropped on save.
const PRODUCT_BADGES = ['Must Try', 'New', 'Popular', 'Best Value', 'Combo', 'Seasonal'];

type VariantRow = {
  id?: string;
  city: string;
  packaging: string;
  ltrs: string;
  packets: string;
  rate: string;
  /// Independent from `rate` — a subscribing customer can pay a different
  /// (usually lower) price per delivery than a one-off Buy Once order.
  /// Left blank it mirrors `rate`, same as before this field existed.
  subscriptionRate: string;
  mrpEcom: string;
  bottleApplicable: boolean;
  pouchApplicable: boolean;
  stockQuantity: string;
  webVisibility: boolean;
  appVisibility: boolean;
};

const emptyVariant: VariantRow = {
  city: '', packaging: '', ltrs: '', packets: '1', rate: '', subscriptionRate: '', mrpEcom: '',
  bottleApplicable: false, pouchApplicable: false, stockQuantity: '100',
  webVisibility: true, appVisibility: true
};

const emptyForm = {
  categoryId: '', subCategoryId: '', productType: '', name: '', shortCode: '',
  discount: '0', gstRate: '0', description: '', hsnCode: '', imageUrl: '',
  mrp: '0', badge: '', foodType: 'veg', isActive: true,
  prepaidGetonce: true, prepaidSubscribe: true, postpaidGetonce: true, postpaidSubscribe: true
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label}{required && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

/// Mirrors the category-products row in the mobile app, so whoever fills this
/// form can see exactly what the customer will see before saving.
function AppRowPreview({ form, variant }: { form: typeof emptyForm; variant?: VariantRow }) {
  const price = Number(variant?.rate || 0);
  const subscribePrice = Number(variant?.subscriptionRate || variant?.rate || 0);
  const mrp = Math.max(Number(form.mrp || 0), Number(variant?.mrpEcom || 0));
  const showMrp = mrp > price;
  const showSubscribeMrp = mrp > subscribePrice;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 min-w-0">
      <span className="text-[10px] uppercase tracking-wide text-gray-400 shrink-0">In app</span>
      <div className="h-10 w-10 shrink-0 rounded-md bg-gray-100 overflow-hidden">
        {form.imageUrl
          ? <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
          : null}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-gray-900 truncate">
            {form.name || 'Product name'}
          </span>
          <span
            className={`inline-flex h-3 w-3 shrink-0 items-center justify-center border ${
              form.foodType === 'non_veg' ? 'border-red-600' : 'border-green-600'
            }`}
            title={form.foodType === 'non_veg' ? 'Non-Veg' : 'Veg'}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${form.foodType === 'non_veg' ? 'bg-red-600' : 'bg-green-600'}`} />
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
          <span className="text-gray-500">{variant?.packaging || 'size'}</span>
          <span title="Buy Once">
            <span className="font-semibold text-gray-900">₹{price || 0}</span>
            {showMrp && <span className="ml-1 text-gray-400 line-through">₹{mrp}</span>}
          </span>
          {(form.prepaidSubscribe || form.postpaidSubscribe) && (
            <span title="Subscribe" className="text-blue-700">
              Sub ₹{subscribePrice || 0}
              {showSubscribeMrp && <span className="ml-1 text-gray-400 line-through">₹{mrp}</span>}
            </span>
          )}
        </div>
      </div>
      {form.badge && (
        <span className="ml-auto shrink-0 rounded-full bg-yellow-300 px-2 py-0.5 text-[11px] font-semibold text-gray-900">
          {form.badge}
        </span>
      )}
    </div>
  );
}

export default function AddEditProduct() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [form, setForm] = useState(emptyForm);
  const [variants, setVariants] = useState<VariantRow[]>([{ ...emptyVariant }]);
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['categoriesLite'],
    queryFn: async () => (await api.get('/admin/categories')).data.data
  });
  const { data: subCategories = [] } = useQuery({
    queryKey: ['subCategoriesLite', form.categoryId],
    queryFn: async () => (await api.get('/admin/products/sub-categories', { params: form.categoryId ? { categoryId: form.categoryId } : {} })).data.data,
    enabled: !!form.categoryId
  });

  const { data: productDetail, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => (await api.get(`/admin/products/${id}`)).data.data,
    enabled: isEdit
  });

  useEffect(() => {
    if (productDetail) {
      const p = productDetail;
      setForm({
        categoryId: p.category_id || '',
        subCategoryId: p.sub_category_id || '',
        productType: p.product_type || '',
        name: p.name || '',
        shortCode: p.short_code || '',
        discount: String(p.discount ?? 0),
        gstRate: String(p.gst_rate ?? 0),
        description: p.description || '',
        hsnCode: p.hsn_code || '',
        imageUrl: p.image_url || '',
        mrp: String(p.mrp ?? 0),
        badge: p.badge || '',
        foodType: p.food_type || 'veg',
        isActive: p.is_active !== false,
        prepaidGetonce: p.prepaid_getonce !== false,
        prepaidSubscribe: p.prepaid_subscribe !== false,
        postpaidGetonce: p.postpaid_getonce !== false,
        postpaidSubscribe: p.postpaid_subscribe !== false
      });
      if (Array.isArray(p.product_variants) && p.product_variants.length > 0) {
        setVariants(p.product_variants.map((v: any) => ({
          id: v.id,
          city: v.city || '',
          packaging: v.size_label || '',
          ltrs: v.ltrs !== null && v.ltrs !== undefined ? String(v.ltrs) : '',
          packets: String(v.packets ?? 1),
          rate: String(v.buy_once ?? 0),
          subscriptionRate: String(v.subscription ?? v.buy_once ?? 0),
          mrpEcom: String(v.mrp_ecom ?? 0),
          bottleApplicable: !!v.bottle_applicable,
          pouchApplicable: !!v.pouch_applicable,
          stockQuantity: String(v.stock_quantity ?? 0),
          webVisibility: v.web_visibility !== false,
          appVisibility: v.app_visibility !== false
        })));
      }
      if (Array.isArray(p.product_images)) {
        setImages(p.product_images.map((img: any) => img.image_url));
      }
    }
  }, [productDetail]);

  const setField = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const setVariant = (index: number, key: keyof VariantRow, value: string | boolean) => {
    setVariants((rows) => rows.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  };

  const addVariant = () => setVariants((rows) => [...rows, { ...emptyVariant }]);
  const removeVariant = (index: number) => setVariants((rows) => rows.length > 1 ? rows.filter((_, i) => i !== index) : rows);

  const addImage = () => {
    if (newImageUrl.trim()) {
      setImages((imgs) => [...imgs, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };
  const removeImage = (index: number) => setImages((imgs) => imgs.filter((_, i) => i !== index));

  const isLiquid = form.productType === 'Liquid';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.categoryId || !form.name.trim() || !form.shortCode.trim()) {
      setError('Category, product name and shortcode are required.');
      return;
    }
    if (variants.some((v) => !v.city || !v.packaging || !v.rate)) {
      setError('Each product detail row needs a city, packaging and rate.');
      return;
    }
    // An MRP at or below the selling price is never shown, so flag it here
    // rather than letting it silently disappear from the app.
    const rate = Number(variants[0]?.rate || 0);
    const mrp = Number(form.mrp || 0);
    if (mrp > 0 && mrp <= rate) {
      setError('MRP must be higher than the product rate, otherwise leave it as 0.');
      return;
    }
    const badRow = variants.find((v) => Number(v.mrpEcom || 0) > 0 && Number(v.mrpEcom) <= Number(v.rate || 0));
    if (badRow) {
      setError(`MRP (Ecom Order) for ${badRow.city || 'a city row'} must be higher than its rate, otherwise leave it as 0.`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        categoryId: form.categoryId,
        subCategoryId: form.subCategoryId || null,
        productType: form.productType || null,
        name: form.name.trim(),
        shortCode: form.shortCode.trim(),
        discount: Number(form.discount || 0),
        gstRate: Number(form.gstRate || 0),
        description: form.description || undefined,
        hsnCode: form.hsnCode || undefined,
        imageUrl: form.imageUrl || undefined,
        mrp: Number(form.mrp || 0),
        badge: form.badge,
        foodType: form.foodType,
        isActive: form.isActive,
        prepaidGetonce: form.prepaidGetonce,
        prepaidSubscribe: form.prepaidSubscribe,
        postpaidGetonce: form.postpaidGetonce,
        postpaidSubscribe: form.postpaidSubscribe,
        images,
        variants: variants.map((v) => ({
          id: v.id,
          city: v.city,
          packaging: v.packaging,
          ltrs: v.ltrs === '' ? undefined : Number(v.ltrs),
          packets: Number(v.packets || 1),
          rate: Number(v.rate || 0),
          // Blank means "same as Buy Once" — never silently 0 a subscription
          // price the admin just hasn't touched yet.
          subscriptionRate: v.subscriptionRate === '' ? Number(v.rate || 0) : Number(v.subscriptionRate || 0),
          mrpEcom: Number(v.mrpEcom || 0),
          bottleApplicable: v.bottleApplicable,
          pouchApplicable: v.pouchApplicable,
          stockQuantity: Number(v.stockQuantity || 0),
          webVisibility: v.webVisibility,
          appVisibility: v.appVisibility
        }))
      };

      if (isEdit) {
        await api.patch(`/admin/products/${id}`, payload);
      } else {
        await api.post('/admin/products', payload);
      }
      navigate('/products');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to save product. Please check the details and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && isLoading) {
    return <div className="text-gray-500 p-8">Loading product...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/products')}>
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Package className="text-blue-600" /> {isEdit ? 'Edit Product' : 'Add New Product'}
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Product Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 border-t border-gray-100 pt-4">
            <Field label="Category" required>
              <Select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value, subCategoryId: '' }))} required>
                <option value="">Select Category</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </Select>
            </Field>
            <Field label="Sub Category">
              <Select value={form.subCategoryId} onChange={setField('subCategoryId')} disabled={!form.categoryId}>
                <option value="">Select Sub Category</option>
                {subCategories.map((s: any) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </Select>
            </Field>
            <Field label="Product Type">
              <Select value={form.productType} onChange={setField('productType')}>
                <option value="">Select Product Type</option>
                {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Product Name" required>
              <Input value={form.name} onChange={setField('name')} required />
            </Field>
            <Field label="Product Shortcode" required>
              <Input value={form.shortCode} onChange={setField('shortCode')} placeholder="e.g. CM1L" required />
            </Field>
            <Field label="HSN Code">
              <Input value={form.hsnCode} onChange={setField('hsnCode')} />
            </Field>
            <Field label="Discount (Rs)">
              <Input type="number" value={form.discount} onChange={setField('discount')} />
            </Field>
            <Field label="GST (%)">
              <Input type="number" value={form.gstRate} onChange={setField('gstRate')} />
            </Field>
            <Field label="Main Product Image URL">
              <Input value={form.imageUrl} onChange={setField('imageUrl')} placeholder="https://..." />
            </Field>
            <Field label="MRP (struck-through price)">
              <Input type="number" value={form.mrp} onChange={setField('mrp')} placeholder="0 = don't show one" />
              <p className="text-[11px] text-gray-400 mt-1">
                Shown crossed out next to the selling price. Leave 0 to show only the selling price.
                A row&apos;s own &ldquo;MRP (Ecom Order)&rdquo; below overrides this.
              </p>
            </Field>
            <Field label="Tag">
              <Select value={form.badge} onChange={setField('badge')}>
                <option value="">No tag</option>
                {PRODUCT_BADGES.map((b) => <option key={b} value={b}>{b}</option>)}
              </Select>
            </Field>
            <Field label="Food Type">
              <Select value={form.foodType} onChange={setField('foodType')}>
                <option value="veg">Veg</option>
                <option value="non_veg">Non-Veg</option>
              </Select>
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Description">
                <textarea
                  className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  rows={3}
                  value={form.description}
                  onChange={setField('description')}
                />
              </Field>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                Visible to customers
                <span className="text-xs font-normal text-gray-500">
                  (uncheck to hide from the app & website without deleting it)
                </span>
              </label>
              <AppRowPreview form={form} variant={variants[0]} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gallery Images</CardTitle>
            <CardDescription>Additional image URLs shown in the product gallery.</CardDescription>
          </CardHeader>
          <CardContent className="border-t border-gray-100 pt-4 space-y-4">
            <div className="flex gap-2">
              <Input placeholder="Enter image URL..." value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} />
              <Button type="button" variant="secondary" onClick={addImage} className="gap-2 shrink-0">
                <Plus size={16} /> Add
              </Button>
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {images.map((url, index) => (
                  <div key={index} className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50 h-24">
                    <img src={url} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <X className="text-white" size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer Eligibility</CardTitle>
            <CardDescription>Choose how this product can be purchased.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2 border-t border-gray-100 pt-4">
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-2">Prepaid Customer</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.prepaidGetonce} onChange={(e) => setForm((f) => ({ ...f, prepaidGetonce: e.target.checked }))} /> One Time Order
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.prepaidSubscribe} onChange={(e) => setForm((f) => ({ ...f, prepaidSubscribe: e.target.checked }))} /> Subscribe
                </label>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-2">Postpaid Customer</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.postpaidGetonce} onChange={(e) => setForm((f) => ({ ...f, postpaidGetonce: e.target.checked }))} /> One Time Order
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.postpaidSubscribe} onChange={(e) => setForm((f) => ({ ...f, postpaidSubscribe: e.target.checked }))} /> Subscribe
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Product Details</CardTitle>
                <CardDescription>Add one row per city — packaging, pricing and visibility can differ by city.</CardDescription>
              </div>
              <Button type="button" variant="secondary" onClick={addVariant} className="gap-2 shrink-0">
                <Plus size={16} /> Add City
              </Button>
            </div>
          </CardHeader>
          <CardContent className="border-t border-gray-100 pt-4 space-y-6">
            {variants.map((v, index) => (
              <div key={index} className="rounded-lg border border-gray-200 p-4 relative">
                {variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVariant(index)}
                    className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                    title="Remove this city"
                  >
                    <X size={14} />
                  </button>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="City" required>
                    <Input value={v.city} onChange={(e) => setVariant(index, 'city', e.target.value)} placeholder="e.g. Pune" required />
                  </Field>
                  <Field label="Packaging" required>
                    <Input value={v.packaging} onChange={(e) => setVariant(index, 'packaging', e.target.value)} placeholder="e.g. 1L, 500g" required />
                  </Field>
                  <Field label={isLiquid ? 'Ltrs' : 'Ltrs (if applicable)'}>
                    <Input type="number" step="0.01" value={v.ltrs} onChange={(e) => setVariant(index, 'ltrs', e.target.value)} placeholder={isLiquid ? '' : 'N/A for this product type'} />
                  </Field>
                  <Field label="Packets">
                    <Input type="number" value={v.packets} onChange={(e) => setVariant(index, 'packets', e.target.value)} />
                  </Field>
                  <Field label="Buy Once Rate (SP)" required>
                    <Input type="number" value={v.rate} onChange={(e) => setVariant(index, 'rate', e.target.value)} required />
                  </Field>
                  <Field label="Subscription Rate (SP)">
                    <Input
                      type="number"
                      value={v.subscriptionRate}
                      onChange={(e) => setVariant(index, 'subscriptionRate', e.target.value)}
                      placeholder={v.rate || '0'}
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Leave blank to match Buy Once.</p>
                  </Field>
                  <Field label="MRP (Ecom Order)">
                    <Input type="number" value={v.mrpEcom} onChange={(e) => setVariant(index, 'mrpEcom', e.target.value)} />
                    <p className="text-[11px] text-gray-400 mt-1">Same MRP is used for both Buy Once and Subscription discounts.</p>
                  </Field>
                  <Field label="Stock Quantity">
                    <Input type="number" value={v.stockQuantity} onChange={(e) => setVariant(index, 'stockQuantity', e.target.value)} />
                  </Field>
                  <div className="flex items-end gap-4 pb-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={v.bottleApplicable} onChange={(e) => setVariant(index, 'bottleApplicable', e.target.checked)} /> Bottle
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={v.pouchApplicable} onChange={(e) => setVariant(index, 'pouchApplicable', e.target.checked)} /> Pouch
                    </label>
                  </div>
                  <div className="flex items-end gap-4 pb-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={v.webVisibility} onChange={(e) => setVariant(index, 'webVisibility', e.target.checked)} /> Web Visible
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={v.appVisibility} onChange={(e) => setVariant(index, 'appVisibility', e.target.checked)} /> App Visible
                    </label>
                  </div>
                  <div className="flex items-end pb-2">
                    {Number(v.stockQuantity) <= 0 ? (
                      <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-1">Out of Stock</span>
                    ) : (
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">In Stock</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="gap-2">
            <Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Update Product' : 'Create'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/products')} className="gap-2">
            <RotateCcw size={16} /> Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
