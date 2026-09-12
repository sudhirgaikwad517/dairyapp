import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Truck, ArrowLeft, Save, RotateCcw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function AddEditDeliveryCharge() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [chargeFrom, setChargeFrom] = useState('');
  const [chargeTo, setChargeTo] = useState('');
  const [charge, setCharge] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: detail, isLoading } = useQuery({
    queryKey: ['deliveryCharge', id],
    queryFn: async () => (await api.get(`/admin/delivery-charges/${id}`)).data.data,
    enabled: isEdit
  });

  useEffect(() => {
    if (detail) {
      setChargeFrom(String(detail.charge_from ?? ''));
      setChargeTo(String(detail.charge_to ?? ''));
      setCharge(String(detail.charge ?? ''));
    }
  }, [detail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (chargeFrom === '' || chargeTo === '' || charge === '') {
      setError('All fields are required.');
      return;
    }
    if (Number(chargeFrom) >= Number(chargeTo)) {
      setError('Charge From must be less than Charge To.');
      return;
    }
    setSaving(true);
    try {
      const payload = { chargeFrom: Number(chargeFrom), chargeTo: Number(chargeTo), charge: Number(charge) };
      if (isEdit) await api.patch(`/admin/delivery-charges/${id}`, payload);
      else await api.post('/admin/delivery-charges', payload);
      navigate('/delivery-charges');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to save delivery charge.');
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && isLoading) return <div className="text-gray-500 p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/delivery-charges')}><ArrowLeft size={16} /></Button>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Truck className="text-blue-600" /> {isEdit ? 'Edit Delivery Charge' : 'Add New Delivery Charge'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}
        <Card>
          <CardHeader><CardTitle className="text-lg">Order Value Range</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Charge From (₹)<span className="text-red-600 ml-0.5">*</span></label>
              <Input type="number" value={chargeFrom} onChange={(e) => setChargeFrom(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Charge To (₹)<span className="text-red-600 ml-0.5">*</span></label>
              <Input type="number" value={chargeTo} onChange={(e) => setChargeTo(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Delivery Charge (₹)<span className="text-red-600 ml-0.5">*</span></label>
              <Input type="number" value={charge} onChange={(e) => setCharge(e.target.value)} required />
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="gap-2"><Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/delivery-charges')} className="gap-2"><RotateCcw size={16} /> Cancel</Button>
        </div>
      </form>
    </div>
  );
}
