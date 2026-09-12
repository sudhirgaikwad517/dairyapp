import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { MapPinned, ArrowLeft, Save, RotateCcw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

const emptyForm = { state: 'Maharashtra', city: '', areaName: '', areaPin: '', isServiceable: true };

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

export default function AddEditDeliveryArea() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: detail, isLoading } = useQuery({
    queryKey: ['deliveryArea', id],
    queryFn: async () => (await api.get(`/admin/logistics/delivery-areas/${id}`)).data.data,
    enabled: isEdit
  });

  useEffect(() => {
    if (detail) {
      setForm({
        state: detail.state || '',
        city: detail.city || '',
        areaName: detail.areaName || '',
        areaPin: detail.areaPin || '',
        isServiceable: !!detail.isServiceable
      });
    }
  }, [detail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.city.trim() || !form.areaName.trim()) {
      setError('City and Area Name are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, city: form.city.trim(), areaName: form.areaName.trim() };
      if (isEdit) await api.patch(`/admin/logistics/delivery-areas/${id}`, payload);
      else await api.post('/admin/logistics/delivery-areas', payload);
      navigate('/logistics/delivery-areas');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to save delivery area.');
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && isLoading) return <div className="text-gray-500 p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/logistics/delivery-areas')}><ArrowLeft size={16} /></Button>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <MapPinned className="text-blue-600" /> {isEdit ? 'Edit Delivery Area' : 'Add New Delivery Area'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}
        <Card>
          <CardHeader><CardTitle className="text-lg">Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
            <Field label="State">
              <Input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
            </Field>
            <Field label="City" required>
              <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} required />
            </Field>
            <Field label="Area Name" required>
              <Input value={form.areaName} onChange={(e) => setForm((f) => ({ ...f, areaName: e.target.value }))} required />
            </Field>
            <Field label="Area Pin">
              <Input value={form.areaPin} onChange={(e) => setForm((f) => ({ ...f, areaPin: e.target.value }))} maxLength={10} />
            </Field>
            <Field label="Service Availability" required>
              <Select value={form.isServiceable ? '1' : '0'} onChange={(e) => setForm((f) => ({ ...f, isServiceable: e.target.value === '1' }))}>
                <option value="1">Delivery Available</option>
                <option value="0">Not Available</option>
              </Select>
            </Field>
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="gap-2"><Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/logistics/delivery-areas')} className="gap-2"><RotateCcw size={16} /> Cancel</Button>
        </div>
      </form>
    </div>
  );
}
