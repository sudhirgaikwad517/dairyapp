import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Ticket, ArrowLeft, Save, RotateCcw, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

function dateOnly(v?: string | null) {
  return v ? v.slice(0, 10) : '';
}

export default function AddEditCoupon() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [form, setForm] = useState({
    code: '', title: '', description: '', discountType: 'percent', discountValue: '',
    minOrderAmount: '0', maxDiscountAmount: '', validFrom: '', validTo: '', usageLimitPerCustomer: '1'
  });
  const [status, setStatus] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: detail, isLoading } = useQuery({
    queryKey: ['coupon', id],
    queryFn: async () => (await api.get(`/admin/coupons/${id}`)).data.data,
    enabled: isEdit
  });

  useEffect(() => {
    if (detail) {
      setForm({
        code: detail.code || '',
        title: detail.title || '',
        description: detail.description || '',
        discountType: detail.discountType || 'percent',
        discountValue: String(detail.discountValue ?? ''),
        minOrderAmount: String(detail.minOrderAmount ?? '0'),
        maxDiscountAmount: detail.maxDiscountAmount != null ? String(detail.maxDiscountAmount) : '',
        validFrom: dateOnly(detail.validFrom),
        validTo: dateOnly(detail.validTo),
        usageLimitPerCustomer: String(detail.usageLimitPerCustomer ?? '1')
      });
      setStatus(!!detail.isActive);
    }
  }, [detail]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim() || (!isEdit && !form.code.trim()) || !form.discountValue) {
      setError('Code, title and discount value are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...(isEdit ? {} : { code: form.code.trim() }),
        title: form.title.trim(),
        description: form.description.trim() || null,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minOrderAmount: Number(form.minOrderAmount || 0),
        maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
        validFrom: form.validFrom || null,
        validTo: form.validTo || null,
        usageLimitPerCustomer: Number(form.usageLimitPerCustomer || 1),
        status
      };
      if (isEdit) await api.patch(`/admin/coupons/${id}`, payload);
      else await api.post('/admin/coupons', payload);
      navigate('/coupons');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to save coupon.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit || !window.confirm('Delete this coupon?')) return;
    await api.delete(`/admin/coupons/${id}`);
    navigate('/coupons');
  };

  if (isEdit && isLoading) return <div className="text-gray-500 p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/coupons')}><ArrowLeft size={16} /></Button>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Ticket className="text-blue-600" /> {isEdit ? 'Edit Coupon' : 'Add New Coupon'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}
        <Card>
          <CardHeader><CardTitle className="text-lg">Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Code<span className="text-red-600 ml-0.5">*</span></label>
              <Input value={form.code} onChange={set('code')} disabled={isEdit} placeholder="e.g. WELCOME10" required />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Title<span className="text-red-600 ml-0.5">*</span></label>
              <Input value={form.title} onChange={set('title')} required />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
              <Input value={form.description} onChange={set('description')} placeholder="Shown under the title in the app" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Discount Type</label>
              <Select value={form.discountType} onChange={set('discountType')}>
                <option value="percent">Percent (%)</option>
                <option value="flat">Flat (₹)</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Discount Value<span className="text-red-600 ml-0.5">*</span></label>
              <Input type="number" min="0" value={form.discountValue} onChange={set('discountValue')} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Max Discount (₹, optional)</label>
              <Input type="number" min="0" value={form.maxDiscountAmount} onChange={set('maxDiscountAmount')} placeholder="Only for percent coupons" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Min Order Amount (₹)</label>
              <Input type="number" min="0" value={form.minOrderAmount} onChange={set('minOrderAmount')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Usage Limit / Customer</label>
              <Input type="number" min="1" value={form.usageLimitPerCustomer} onChange={set('usageLimitPerCustomer')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Valid From</label>
              <Input type="date" value={form.validFrom} onChange={set('validFrom')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Valid To</label>
              <Input type="date" min={form.validFrom} value={form.validTo} onChange={set('validTo')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status<span className="text-red-600 ml-0.5">*</span></label>
              <div className="flex gap-6 mt-2.5">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="radio" checked={status === true} onChange={() => setStatus(true)} /> Activated
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="radio" checked={status === false} onChange={() => setStatus(false)} /> Deactivated
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="gap-2"><Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/coupons')} className="gap-2"><RotateCcw size={16} /> Cancel</Button>
          {isEdit && (
            <Button type="button" variant="outline" onClick={handleDelete} className="gap-2 text-red-600 hover:bg-red-50 ml-auto"><Trash2 size={16} /> Delete</Button>
          )}
        </div>
      </form>
    </div>
  );
}
