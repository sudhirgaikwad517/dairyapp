import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Wallet, ArrowLeft, Minus } from 'lucide-react';
import { api } from '../../lib/api';
import CustomerPicker from '../../components/CustomerPicker';
import { useAuth } from '../../context/AuthContext';
import AccessDenied from '../../components/AccessDenied';

export default function DebitMoneyFromWallet() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [customer, setCustomer] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!customer || !amount || Number(amount) <= 0 || !remark.trim()) {
      setError('Customer, debit amount and remark are all required.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/admin/wallet/debit-money', { customerId: customer.id, amount: Number(amount), remark: remark.trim() });
      setSuccess(`₹${amount} debited. New balance: ₹${res.data.data.balance}.`);
      setAmount('');
      setRemark('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to debit money.');
    } finally {
      setSaving(false);
    }
  };

  if (!can('wallet_report', 'canCreate')) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/wallet/report')}><ArrowLeft size={16} /></Button>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Wallet className="text-red-600" /> Debit Money from Wallet
          </h2>
        </div>
        <AccessDenied />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/wallet/report')}><ArrowLeft size={16} /></Button>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Wallet className="text-red-600" /> Debit Money from Wallet
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}
        {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm px-4 py-3">{success}</div>}

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
          <CardContent className="grid gap-4 border-t border-gray-100 pt-4">
            <div className="max-w-xs">
              <label className="block text-xs font-medium text-gray-500 mb-1">Debit Amount<span className="text-red-600 ml-0.5">*</span></label>
              <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Remark<span className="text-red-600 ml-0.5">*</span></label>
              <textarea
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-h-[80px]"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Why is this amount being debited?"
                required
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" variant="destructive" disabled={saving || !customer} className="gap-2"><Minus size={16} /> {saving ? 'Debiting...' : 'Debit Money'}</Button>
        </div>
      </form>
    </div>
  );
}
