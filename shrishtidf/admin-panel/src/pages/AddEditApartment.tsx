import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Building, ArrowLeft, Save, RotateCcw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function AddEditApartment() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [deliveryAreaId, setDeliveryAreaId] = useState('');
  const [subAreaId, setSubAreaId] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: areas = [] } = useQuery({
    queryKey: ['deliveryAreasLite'],
    queryFn: async () => (await api.get('/admin/logistics/delivery-areas')).data.data
  });
  const { data: subAreas = [] } = useQuery({
    queryKey: ['subAreasLite', deliveryAreaId],
    queryFn: async () => (await api.get('/admin/logistics/sub-areas', { params: deliveryAreaId ? { deliveryAreaId } : {} })).data.data
  });

  const { data: detail, isLoading } = useQuery({
    queryKey: ['apartment', id],
    queryFn: async () => (await api.get(`/admin/logistics/apartments/${id}`)).data.data,
    enabled: isEdit
  });

  useEffect(() => {
    if (detail) {
      setSubAreaId(detail.subAreaId || '');
      setName(detail.name || '');
    }
  }, [detail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!subAreaId || !name.trim()) {
      setError('Sub Area and Apartment name are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = { subAreaId, name: name.trim() };
      if (isEdit) await api.patch(`/admin/logistics/apartments/${id}`, payload);
      else await api.post('/admin/logistics/apartments', payload);
      navigate('/logistics/apartments');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to save apartment.');
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && isLoading) return <div className="text-gray-500 p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/logistics/apartments')}><ArrowLeft size={16} /></Button>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Building className="text-blue-600" /> {isEdit ? 'Edit Apartment' : 'Add New Apartment'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}
        <Card>
          <CardHeader><CardTitle className="text-lg">Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Apartment Name<span className="text-red-600 ml-0.5">*</span></label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Delivery Area</label>
              <Select value={deliveryAreaId} onChange={(e) => { setDeliveryAreaId(e.target.value); setSubAreaId(''); }}>
                <option value="">Select Delivery Area (to narrow Sub Area list)</option>
                {areas.map((a: any) => <option key={a.id} value={a.id}>{a.areaName}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Sub Area<span className="text-red-600 ml-0.5">*</span></label>
              <Select value={subAreaId} onChange={(e) => setSubAreaId(e.target.value)} required>
                <option value="">Select Sub Area</option>
                {subAreas.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="gap-2"><Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/logistics/apartments')} className="gap-2"><RotateCcw size={16} /> Cancel</Button>
        </div>
      </form>
    </div>
  );
}
