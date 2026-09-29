import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Plane, ArrowLeft, Save, RotateCcw } from 'lucide-react';
import { api } from '../lib/api';
import CustomerPicker from '../components/CustomerPicker';

export default function AddVacation() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<any>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [remark, setRemark] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!customer || !fromDate || !toDate) {
      setError('Customer, From Date and To Date are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/vacations', { customerId: customer.id, fromDate, toDate, remark: remark || undefined });
      navigate('/subscriptions/vacations');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to save vacation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/subscriptions/vacations')}><ArrowLeft size={16} /></Button>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Plane className="text-blue-600" /> Add New Vacation
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}

        <Card>
          <CardHeader><CardTitle className="text-lg">Customer</CardTitle></CardHeader>
          <CardContent className="border-t border-gray-100 pt-4">
            {customer ? (
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium text-gray-900">{customer.code} - {customer.name}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => setCustomer(null)}>Change</Button>
              </div>
            ) : (
              <CustomerPicker onSelect={(c) => setCustomer(c)} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From Date<span className="text-red-600 ml-0.5">*</span></label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To Date<span className="text-red-600 ml-0.5">*</span></label>
              <Input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} required />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Remark</label>
              <textarea
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-h-[80px]"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="gap-2"><Save size={16} /> {saving ? 'Saving...' : 'Create'}</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/subscriptions/vacations')} className="gap-2"><RotateCcw size={16} /> Cancel</Button>
        </div>
      </form>
    </div>
  );
}
