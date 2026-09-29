import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Receipt, ArrowLeft, Save, RotateCcw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import CustomerPicker from '../../components/CustomerPicker';
import { useAuth } from '../../context/AuthContext';
import AccessDenied from '../../components/AccessDenied';

export default function AddEditBilling() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { can } = useAuth();
  const allowed = can('customer_billing', isEdit ? 'canUpdate' : 'canCreate');

  const [customer, setCustomer] = useState<any>(null);
  const [billAmount, setBillAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('0');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: detail, isLoading } = useQuery({
    queryKey: ['billingDetail', id],
    queryFn: async () => (await api.get(`/admin/wallet/billing/${id}`)).data.data,
    enabled: isEdit
  });

  useEffect(() => {
    if (detail) {
      setCustomer({ id: detail.customerId, code: detail.customerCode, name: detail.customerName });
      setBillAmount(String(detail.billAmount));
      setPaidAmount(String(detail.paidAmount));
      setFromDate(String(detail.fromDate).slice(0, 10));
      setToDate(String(detail.toDate).slice(0, 10));
    }
  }, [detail]);

  const remaining = useMemo(() => {
    const bill = Number(billAmount) || 0;
    const paid = Number(paidAmount) || 0;
    return bill - paid;
  }, [billAmount, paidAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!customer || !billAmount || !fromDate || !toDate) {
      setError('Customer, bill amount, from date and to date are required.');
      return;
    }
    if (Number(paidAmount) < 0 || Number(billAmount) < 0) {
      setError('Amounts cannot be negative.');
      return;
    }
    setSaving(true);
    try {
      const payload = { customerId: customer.id, billAmount: Number(billAmount), paidAmount: Number(paidAmount), fromDate, toDate };
      if (isEdit) await api.patch(`/admin/wallet/billing/${id}`, payload);
      else await api.post('/admin/wallet/billing', payload);
      navigate('/wallet/billing');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to save billing.');
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && isLoading) return <div className="text-gray-500 p-8">Loading...</div>;
  if (!allowed) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/wallet/billing')}><ArrowLeft size={16} /></Button>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Receipt className="text-blue-600" /> {isEdit ? 'Edit Billing' : 'Add New Billing'}
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
                {!isEdit && <Button type="button" variant="outline" size="sm" onClick={() => setCustomer(null)}>Change</Button>}
              </div>
            ) : (
              <CustomerPicker onSelect={(c) => setCustomer(c)} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Billing Period</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From Date<span className="text-red-600 ml-0.5">*</span></label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To Date<span className="text-red-600 ml-0.5">*</span></label>
              <Input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} required />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Amounts</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Bill Amount<span className="text-red-600 ml-0.5">*</span></label>
              <Input type="number" min={0} value={billAmount} onChange={(e) => setBillAmount(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Paid Amount<span className="text-red-600 ml-0.5">*</span></label>
              <Input type="number" min={0} value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Remaining Amount</label>
              <Input value={remaining} disabled className={remaining > 0 ? 'text-red-600 font-medium' : ''} />
              <p className="text-xs text-gray-500 mt-1">Calculated automatically (Bill − Paid).</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <div className="mt-2">
                {remaining <= 0 ? <Badge variant="success">Paid</Badge> : <Badge variant="destructive">Unpaid</Badge>}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="gap-2"><Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/wallet/billing')} className="gap-2"><RotateCcw size={16} /> Cancel</Button>
        </div>
      </form>
    </div>
  );
}
