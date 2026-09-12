import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Landmark, ArrowLeft, Save, RotateCcw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function AddEditSubArea() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [deliveryAreaId, setDeliveryAreaId] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: areas = [] } = useQuery({
    queryKey: ['deliveryAreasLite'],
    queryFn: async () => (await api.get('/admin/logistics/delivery-areas')).data.data
  });

  const { data: detail, isLoading } = useQuery({
    queryKey: ['subArea', id],
    queryFn: async () => (await api.get(`/admin/logistics/sub-areas/${id}`)).data.data,
    enabled: isEdit
  });

  useEffect(() => {
    if (detail) {
      setDeliveryAreaId(detail.deliveryAreaId || '');
      setName(detail.name || '');
    }
  }, [detail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!deliveryAreaId || !name.trim()) {
      setError('Delivery Area and Sub Area name are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = { deliveryAreaId, name: name.trim() };
      if (isEdit) await api.patch(`/admin/logistics/sub-areas/${id}`, payload);
      else await api.post('/admin/logistics/sub-areas', payload);
      navigate('/logistics/sub-areas');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to save sub area.');
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && isLoading) return <div className="text-gray-500 p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/logistics/sub-areas')}><ArrowLeft size={16} /></Button>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Landmark className="text-blue-600" /> {isEdit ? 'Edit Sub Area' : 'Add New Sub Area'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}
        <Card>
          <CardHeader><CardTitle className="text-lg">Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Delivery Area<span className="text-red-600 ml-0.5">*</span></label>
              <Select value={deliveryAreaId} onChange={(e) => setDeliveryAreaId(e.target.value)} required>
                <option value="">Select Delivery Area</option>
                {areas.map((a: any) => <option key={a.id} value={a.id}>{a.areaName}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Sub Area<span className="text-red-600 ml-0.5">*</span></label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="gap-2"><Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/logistics/sub-areas')} className="gap-2"><RotateCcw size={16} /> Cancel</Button>
        </div>
      </form>
    </div>
  );
}
