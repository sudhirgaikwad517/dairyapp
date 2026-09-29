import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { RefreshCcw, Eye, Save } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import CustomerPicker from '../components/CustomerPicker';

export default function ChangeRequest() {
  const [customer, setCustomer] = useState<any>(null);
  const [planId, setPlanId] = useState('');
  const [viewedPlanId, setViewedPlanId] = useState('');
  const [form, setForm] = useState({ quantity: '', variantId: '', frequency: '', deliveryModeId: '', customDetails: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: plans = [] } = useQuery({
    queryKey: ['customerPlans', customer?.id],
    queryFn: async () => (await api.get(`/admin/subscriptions/customer/${customer.id}/plans`)).data.data,
    enabled: !!customer
  });

  const { data: subscription, isLoading: loadingSub } = useQuery({
    queryKey: ['subscriptionDetail', viewedPlanId],
    queryFn: async () => (await api.get(`/admin/subscriptions/${viewedPlanId}`)).data.data,
    enabled: !!viewedPlanId
  });

  const { data: product } = useQuery({
    queryKey: ['productForChange', subscription?.productId],
    queryFn: async () => (await api.get(`/admin/products/${subscription.productId}`)).data.data,
    enabled: !!subscription?.productId
  });

  const { data: deliveryModes = [] } = useQuery({
    queryKey: ['deliveryModesActive'],
    queryFn: async () => (await api.get('/admin/delivery-modes', { params: { activeOnly: 'true' } })).data.data
  });

  useEffect(() => {
    if (subscription) {
      setForm({
        quantity: String(subscription.qty),
        variantId: subscription.productId ? '' : '',
        frequency: subscription.frequency,
        deliveryModeId: '',
        customDetails: subscription.customDetails || ''
      });
    }
  }, [subscription]);

  useEffect(() => {
    if (product && subscription) {
      const currentVariant = product.product_variants?.find((v: any) => v.size_label === subscription.packaging);
      setForm((f) => ({ ...f, variantId: currentVariant?.id || product.product_variants?.[0]?.id || '' }));
    }
  }, [product, subscription]);

  const handleView = () => {
    setViewedPlanId(planId);
    setError('');
    setSuccess('');
  };

  const handleReset = () => {
    setCustomer(null);
    setPlanId('');
    setViewedPlanId('');
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const res = await api.patch(`/admin/subscriptions/${viewedPlanId}/change-request`, {
        quantity: Number(form.quantity),
        variantId: form.variantId || undefined,
        frequency: form.frequency,
        deliveryModeId: form.deliveryModeId || undefined,
        customDetails: form.customDetails
      });
      setSuccess(`Change request accepted. It will take effect from ${res.data.data.effectiveFrom}.`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to submit change request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
        <RefreshCcw className="text-blue-600" /> Change Request
      </h2>

      <Card>
        <CardHeader><CardTitle className="text-lg">Select Plan</CardTitle></CardHeader>
        <CardContent className="space-y-4 border-t border-gray-100 pt-4">
          {!customer ? (
            <CustomerPicker onSelect={(c) => setCustomer(c)} />
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Customer</p>
                <p className="text-sm font-medium text-gray-900">{customer.code} - {customer.name}</p>
              </div>
              <div className="min-w-[280px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Plan</label>
                <Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
                  <option value="">Select Plan</option>
                  {plans.map((p: any) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </Select>
              </div>
              <Button onClick={handleView} disabled={!planId} className="gap-2"><Eye size={16} /> View</Button>
              <Button variant="outline" onClick={handleReset}>Reset</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {viewedPlanId && loadingSub && <div className="text-gray-500">Loading plan...</div>}

      {viewedPlanId && subscription && !loadingSub && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{subscription.productName}</CardTitle>
            <CardDescription>
              Current: {subscription.packaging}, Qty {subscription.qty}, {subscription.frequency}, ₹{subscription.rate}/unit
              {subscription.hasPendingChange && <span className="text-amber-600"> · A change is already pending, effective {subscription.changeEffectiveDate ? String(subscription.changeEffectiveDate).slice(0, 10) : ''}</span>}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 border-t border-gray-100 pt-4">
            {error && <div className="sm:col-span-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}
            {success && <div className="sm:col-span-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm px-4 py-3">{success}</div>}

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Packaging</label>
              <Select value={form.variantId} onChange={(e) => setForm((f) => ({ ...f, variantId: e.target.value }))}>
                {(product?.product_variants || []).map((v: any) => (
                  <option key={v.id} value={v.id}>{v.size_label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
              <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Frequency</label>
              <Select value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}>
                <option value="daily">Daily</option>
                <option value="alternate_days">Alternate Days</option>
                <option value="weekly">Weekly</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Delivery Type</label>
              <Select value={form.deliveryModeId} onChange={(e) => setForm((f) => ({ ...f, deliveryModeId: e.target.value }))}>
                <option value="">Keep current</option>
                {deliveryModes.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Custom Details</label>
              <Input value={form.customDetails} onChange={(e) => setForm((f) => ({ ...f, customDetails: e.target.value }))} placeholder="Any delivery instructions or notes for this plan" />
            </div>

            <div className="sm:col-span-3">
              <Button onClick={handleSubmit} disabled={saving} className="gap-2"><Save size={16} /> {saving ? 'Submitting...' : 'Submit Change Request'}</Button>
              <p className="text-xs text-gray-500 mt-2">Quantity, packaging, frequency and delivery type changes take effect from the next available cutoff-safe date — today's or an already-locked-in delivery is never altered retroactively.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
