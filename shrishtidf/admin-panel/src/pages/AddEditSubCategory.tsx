import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Layers, ArrowLeft, Save, RotateCcw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

const emptyForm = { name: '', categoryId: '', imageUrl: '', status: true };

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

export default function AddEditSubCategory() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['categoriesLite'],
    queryFn: async () => (await api.get('/admin/categories')).data.data
  });

  const { data: subCategoryDetail, isLoading } = useQuery({
    queryKey: ['productSubCategory', id],
    queryFn: async () => (await api.get(`/admin/product-sub-categories/${id}`)).data.data,
    enabled: isEdit
  });

  useEffect(() => {
    if (subCategoryDetail) {
      setForm({
        name: subCategoryDetail.label || '',
        categoryId: subCategoryDetail.category_id || '',
        imageUrl: subCategoryDetail.image_url || '',
        status: !!subCategoryDetail.is_active
      });
    }
  }, [subCategoryDetail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim() || !form.categoryId) {
      setError('Sub category name and category are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        categoryId: form.categoryId,
        imageUrl: form.imageUrl || undefined,
        status: form.status
      };
      if (isEdit) {
        await api.patch(`/admin/product-sub-categories/${id}`, payload);
      } else {
        await api.post('/admin/product-sub-categories', payload);
      }
      navigate('/product-sub-categories');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to save sub category. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && isLoading) {
    return <div className="text-gray-500 p-8">Loading sub category...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/product-sub-categories')}>
          <ArrowLeft size={16} />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Layers className="text-blue-600" /> {isEdit ? 'Edit Product Sub Category' : 'Add New Product Sub Category'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sub Category Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
            <Field label="Sub Category Name" required>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </Field>
            <Field label="Category" required>
              <Select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} required>
                <option value="">Select Category</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </Select>
            </Field>
            <Field label="Sub Category Image URL">
              <Input value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." />
            </Field>

            {form.imageUrl && (
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-gray-500 mb-2">Preview</p>
                <img src={form.imageUrl} alt="Sub category preview" className="w-28 h-28 object-cover rounded-lg border border-gray-200" />
              </div>
            )}

            <div className="sm:col-span-2">
              <Field label="Status" required>
                <div className="flex gap-6 mt-1">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="radio" checked={form.status === true} onChange={() => setForm((f) => ({ ...f, status: true }))} /> Activated
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="radio" checked={form.status === false} onChange={() => setForm((f) => ({ ...f, status: false }))} /> Deactivated
                  </label>
                </div>
              </Field>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="gap-2">
            <Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/product-sub-categories')} className="gap-2">
            <RotateCcw size={16} /> Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
