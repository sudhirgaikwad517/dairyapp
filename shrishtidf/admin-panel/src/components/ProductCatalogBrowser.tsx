import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Select } from './ui/Select';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { PackageSearch, Send } from 'lucide-react';

type Mode = 'subscribe' | 'onetime';

type RowState = {
  variantId: string;
  qty: number;
  deliveryModeId: string;
  frequency: string;
  /// Only meaningful when frequency === 'day_wise' — ISO weekdays, 1=Mon..7=Sun.
  dayWiseDays: number[];
  date: string;
  planValidDays: string;
};

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Every day' },
  { value: 'alternate_days', label: 'Alternate day' },
  { value: 'every_3_days', label: 'Every 3 days' },
  { value: 'day_wise', label: 'Day wise' },
];

const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function tomorrowStr() {
  const d = new Date(Date.now() + 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ProductCatalogBrowser({ customerId, mode }: { customerId: string; mode: Mode }) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [submittingProductId, setSubmittingProductId] = useState<string | null>(null);
  const [submittingAll, setSubmittingAll] = useState(false);
  const [message, setMessage] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptionCatalog', customerId, mode],
    queryFn: async () => (await api.get(`/admin/subscriptions/customer/${customerId}/catalog`, { params: { mode } })).data.data
  });

  useEffect(() => {
    if (!data) return;
    const next: Record<string, RowState> = {};
    for (const category of data.categories) {
      for (const product of category.products) {
        const defaultVariant = product.variants.find((v: any) => v.isDefault) || product.variants[0];
        next[product.id] = {
          variantId: defaultVariant?.id || '',
          qty: 0,
          deliveryModeId: data.deliveryModes[0]?.id || '',
          frequency: 'daily',
          dayWiseDays: [],
          date: mode === 'subscribe' ? tomorrowStr() : tomorrowStr(),
          planValidDays: '30'
        };
      }
    }
    setRows(next);
  }, [data, mode]);

  const findVariant = (product: any, variantId: string) => product.variants.find((v: any) => v.id === variantId);

  const total = useMemo(() => {
    if (!data) return 0;
    let sum = 0;
    for (const category of data.categories) {
      for (const product of category.products) {
        const row = rows[product.id];
        if (!row || row.qty <= 0) continue;
        const variant = findVariant(product, row.variantId);
        if (variant) sum += variant.rate * row.qty;
      }
    }
    return sum;
  }, [rows, data]);

  const updateRow = (productId: string, patch: Partial<RowState>) => {
    setRows((r) => ({ ...r, [productId]: { ...r[productId], ...patch } }));
  };

  const buildItem = (product: any) => {
    const row = rows[product.id];
    if (mode === 'subscribe') {
      return {
        productId: product.id,
        variantId: row.variantId || null,
        quantity: row.qty,
        frequency: row.frequency,
        dayWiseDays: row.frequency === 'day_wise' ? row.dayWiseDays : undefined,
        deliveryModeId: row.deliveryModeId || null,
        startDate: row.date,
        planValidDays: row.planValidDays ? Number(row.planValidDays) : null
      };
    }
    return { productId: product.id, variantId: row.variantId || null, quantity: row.qty };
  };

  const rowIsValid = (row: RowState) => row.qty > 0 && (row.frequency !== 'day_wise' || row.dayWiseDays.length > 0);

  const submitOne = async (product: any) => {
    const row = rows[product.id];
    if (!row || !rowIsValid(row)) return;
    setSubmittingProductId(product.id);
    setMessage('');
    try {
      if (mode === 'subscribe') {
        await api.post('/admin/subscriptions/subscribe', { customerId, items: [buildItem(product)] });
      } else {
        await api.post('/admin/subscriptions/one-time-order', { customerId, deliveryDate: row.date, items: [buildItem(product)] });
      }
      updateRow(product.id, { qty: 0 });
      setMessage(`${product.name} ${mode === 'subscribe' ? 'subscribed' : 'ordered'} successfully.`);
      queryClient.invalidateQueries({ queryKey: ['subscriptionCatalog', customerId, mode] });
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Unable to complete this request.');
    } finally {
      setSubmittingProductId(null);
    }
  };

  const submitAll = async () => {
    if (!data) return;
    const items: any[] = [];
    for (const category of data.categories) {
      for (const product of category.products) {
        const row = rows[product.id];
        if (row && rowIsValid(row)) items.push(buildItem(product));
      }
    }
    if (items.length === 0) return;
    setSubmittingAll(true);
    setMessage('');
    try {
      if (mode === 'subscribe') {
        await api.post('/admin/subscriptions/subscribe', { customerId, items });
      } else {
        const firstProductId = Object.keys(rows).find((id) => rows[id].qty > 0);
        const date = firstProductId ? rows[firstProductId].date : tomorrowStr();
        await api.post('/admin/subscriptions/one-time-order', { customerId, deliveryDate: date, items });
      }
      setRows((r) => {
        const next = { ...r };
        for (const id of Object.keys(next)) next[id] = { ...next[id], qty: 0 };
        return next;
      });
      setMessage(`${items.length} product(s) ${mode === 'subscribe' ? 'subscribed' : 'added to the order'} successfully.`);
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Unable to complete this request.');
    } finally {
      setSubmittingAll(false);
    }
  };

  if (isLoading) return <div className="text-gray-500 p-8">Loading catalog...</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3">
        <div>
          <p className="font-medium text-gray-900">{data.customer.code} - {data.customer.name}</p>
          <p className="text-xs text-gray-500 capitalize">{data.customer.customerType} · {data.customer.city || 'No city'}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-gray-500">Total (Inclusive of GST)</p>
            <p className="text-lg font-bold text-gray-900">Rs. {total.toFixed(2)}</p>
          </div>
          <Button onClick={submitAll} disabled={submittingAll || total === 0} className="gap-2">
            <Send size={16} /> {submittingAll ? 'Submitting...' : mode === 'subscribe' ? 'Subscribe' : 'One Time Order'}
          </Button>
        </div>
      </div>

      {message && <div className="rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm px-4 py-3">{message}</div>}

      {data.categories.length === 0 && (
        <div className="text-center text-gray-500 py-10">
          <PackageSearch className="mx-auto mb-2 text-gray-400" />
          No products are available for this customer in this mode.
        </div>
      )}

      {data.categories.map((category: any) => (
        <Card key={category.id}>
          <CardHeader><CardTitle className="text-base">Category : {category.label}</CardTitle></CardHeader>
          <CardContent className="space-y-4 border-t border-gray-100 pt-4">
            {category.products.map((product: any) => {
              const row = rows[product.id];
              if (!row) return null;
              const variant = findVariant(product, row.variantId);
              return (
                <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                  <p className="font-medium text-gray-900 mb-3">{product.name}</p>
                  <div className={`grid gap-3 ${mode === 'subscribe' ? 'sm:grid-cols-6' : 'sm:grid-cols-4'} items-end`}>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Packaging</label>
                      <Select value={row.variantId} onChange={(e) => updateRow(product.id, { variantId: e.target.value })}>
                        {product.variants.map((v: any) => <option key={v.id} value={v.id}>{v.sizeLabel}</option>)}
                      </Select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Rate ₹</label>
                      <Input value={variant?.rate ?? 0} disabled />
                    </div>
                    {mode === 'subscribe' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Delivery Type</label>
                        <Select value={row.deliveryModeId} onChange={(e) => updateRow(product.id, { deliveryModeId: e.target.value })}>
                          <option value="">Select Delivery Type</option>
                          {data.deliveryModes.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </Select>
                      </div>
                    )}
                    {mode === 'subscribe' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Delivery Schedule</label>
                        <Select
                          value={row.frequency}
                          onChange={(e) => updateRow(product.id, { frequency: e.target.value, dayWiseDays: [] })}
                        >
                          {FREQUENCY_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </Select>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{mode === 'subscribe' ? 'Start Date' : 'Date'}</label>
                      <Input type="date" value={row.date} min={todayStr()} onChange={(e) => updateRow(product.id, { date: e.target.value })} />
                    </div>
                    {mode === 'subscribe' && data.customer.customerType === 'prepaid' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Valid For</label>
                        <Select value={row.planValidDays} onChange={(e) => updateRow(product.id, { planValidDays: e.target.value })}>
                          <option value="">Until Cancelled</option>
                          <option value="30">30 Days</option>
                          <option value="90">90 Days</option>
                          <option value="180">180 Days</option>
                        </Select>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Qty</label>
                      <Select value={String(row.qty)} onChange={(e) => updateRow(product.id, { qty: Number(e.target.value) })}>
                        <option value="0">Select</option>
                        {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
                      </Select>
                    </div>
                    {mode === 'subscribe' && (
                      <div>
                        <Button
                          size="sm" className="w-full"
                          disabled={!rowIsValid(row) || submittingProductId === product.id}
                          onClick={() => submitOne(product)}
                        >
                          {submittingProductId === product.id ? 'Subscribing...' : 'Subscribe'}
                        </Button>
                      </div>
                    )}
                  </div>
                  {mode === 'subscribe' && row.frequency === 'day_wise' && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Deliver on</label>
                      <div className="flex flex-wrap gap-1.5">
                        {WEEKDAYS.map((d) => {
                          const selected = row.dayWiseDays.includes(d.value);
                          return (
                            <button
                              key={d.value}
                              type="button"
                              onClick={() => updateRow(product.id, {
                                dayWiseDays: selected
                                  ? row.dayWiseDays.filter((v) => v !== d.value)
                                  : [...row.dayWiseDays, d.value].sort()
                              })}
                              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                selected
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400'
                              }`}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                      {row.dayWiseDays.length === 0 && (
                        <p className="text-xs text-red-600 mt-1">Choose at least one day.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
