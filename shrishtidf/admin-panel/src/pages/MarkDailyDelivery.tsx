import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ClipboardCheck, Eye, Save, Undo2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type EditState = { quantityDelivered: string; remark: string; bottlesCollected: string };

export default function MarkDailyDelivery() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ date: todayStr(), deliveryBoyId: '', hubId: '', city: '', unmarked: false });
  const [applied, setApplied] = useState(filters);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [saving, setSaving] = useState(false);
  const [unmarkingId, setUnmarkingId] = useState<string | null>(null);

  const { data: deliveryBoys = [] } = useQuery({ queryKey: ['deliveryBoysLite'], queryFn: async () => (await api.get('/admin/delivery-boys')).data.data });
  const { data: hubs = [] } = useQuery({ queryKey: ['hubsLite'], queryFn: async () => (await api.get('/admin/hubs')).data.data });

  const queryKey = ['dailyDeliveries', applied];
  const { data: rows = [], isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string, string> = { date: applied.date };
      if (applied.deliveryBoyId) params.deliveryBoyId = applied.deliveryBoyId;
      if (applied.hubId) params.hubId = applied.hubId;
      if (applied.city) params.city = applied.city;
      if (applied.unmarked) params.unmarked = 'true';
      return (await api.get('/admin/logistics/daily-deliveries', { params })).data.data;
    }
  });

  useEffect(() => {
    const next: Record<string, EditState> = {};
    for (const r of rows) {
      next[r.subscriptionId] = {
        quantityDelivered: String(r.quantityDelivered),
        remark: r.remark || '',
        bottlesCollected: String(r.bottlesCollected || 0)
      };
    }
    setEdits(next);
  }, [rows]);

  const handleView = () => setApplied(filters);

  const handleSaveAll = async () => {
    if (rows.length === 0) return;
    setSaving(true);
    try {
      const deliveries = rows.map((r: any) => ({
        subscriptionId: r.subscriptionId,
        customerId: r.customerId,
        productId: r.productId,
        variantId: r.variantId,
        deliveryBoyId: r.deliveryBoyId,
        quantityOrdered: r.quantityOrdered,
        quantityDelivered: Number(edits[r.subscriptionId]?.quantityDelivered ?? r.quantityDelivered),
        remark: edits[r.subscriptionId]?.remark ?? r.remark,
        bottlesCollected: Number(edits[r.subscriptionId]?.bottlesCollected ?? r.bottlesCollected)
      }));
      await api.post('/admin/logistics/daily-deliveries', { date: applied.date, deliveries });
      await queryClient.invalidateQueries({ queryKey });
    } finally {
      setSaving(false);
    }
  };

  const handleUnmark = async (recordId: string) => {
    setUnmarkingId(recordId);
    try {
      await api.post(`/admin/logistics/daily-deliveries/${recordId}/unmark`);
      await queryClient.invalidateQueries({ queryKey });
    } finally {
      setUnmarkingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <ClipboardCheck className="text-blue-600" /> Mark Daily Delivery
        </h2>
        <p className="text-gray-500 mt-1">Record what was actually delivered against each subscription for a given day. If the pending bottle count is negative, it is adjusted the next time you mark this customer's delivery.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end border-t border-gray-100 pt-4">
          <Field label="Date">
            <Input type="date" value={filters.date} onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))} />
          </Field>
          <Field label="Delivery Boy">
            <Select value={filters.deliveryBoyId} onChange={(e) => setFilters((f) => ({ ...f, deliveryBoyId: e.target.value }))}>
              <option value="">All Delivery Boys</option>
              {deliveryBoys.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          <Field label="Hub">
            <Select value={filters.hubId} onChange={(e) => setFilters((f) => ({ ...f, hubId: e.target.value }))}>
              <option value="">Select Hub</option>
              {hubs.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </Select>
          </Field>
          <Field label="City">
            <Input value={filters.city} onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))} />
          </Field>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-sm text-gray-700">
              <input type="checkbox" checked={filters.unmarked} onChange={(e) => setFilters((f) => ({ ...f, unmarked: e.target.checked }))} />
              Unmarked Deliveries
            </label>
            <Button onClick={handleView} className="gap-2"><Eye size={16} /> View</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deliveries for {applied.date}</CardTitle>
          <CardDescription>{isLoading || isFetching ? 'Loading...' : `Total ${rows.length} results`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Hub</TableHead>
                  <TableHead>Delivery Boy</TableHead>
                  <TableHead>Delivery Mode</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Ordered Qty</TableHead>
                  <TableHead>Delivered Qty</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Remark</TableHead>
                  <TableHead>Collect Bottle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Unmark</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r: any) => {
                  const e = edits[r.subscriptionId] || { quantityDelivered: String(r.quantityDelivered), remark: r.remark || '', bottlesCollected: String(r.bottlesCollected || 0) };
                  const pending = r.quantityOrdered - Number(e.quantityDelivered || 0);
                  return (
                    <TableRow key={r.subscriptionId}>
                      <TableCell>
                        <span className="font-medium text-gray-900 block">{r.customerName}</span>
                        <span className="text-xs text-gray-500">{r.address}</span>
                      </TableCell>
                      <TableCell className="text-gray-700">{r.hub || '—'}</TableCell>
                      <TableCell className="text-gray-700">{r.deliveryBoy || '—'}</TableCell>
                      <TableCell className="text-gray-700">{r.deliveryMode || '—'}</TableCell>
                      <TableCell className="text-gray-700">{r.productName}</TableCell>
                      <TableCell className="text-gray-700">{r.quantityOrdered}</TableCell>
                      <TableCell>
                        <Input
                          type="number" step="0.5" className="w-20"
                          value={e.quantityDelivered}
                          onChange={(ev) => setEdits((prev) => ({ ...prev, [r.subscriptionId]: { ...e, quantityDelivered: ev.target.value } }))}
                        />
                      </TableCell>
                      <TableCell className={pending < 0 ? 'text-amber-600' : 'text-gray-700'}>{pending}</TableCell>
                      <TableCell>
                        <Input
                          className="w-32"
                          value={e.remark}
                          onChange={(ev) => setEdits((prev) => ({ ...prev, [r.subscriptionId]: { ...e, remark: ev.target.value } }))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number" className="w-20"
                          value={e.bottlesCollected}
                          onChange={(ev) => setEdits((prev) => ({ ...prev, [r.subscriptionId]: { ...e, bottlesCollected: ev.target.value } }))}
                        />
                      </TableCell>
                      <TableCell>
                        {r.recordId ? <Badge variant="success">Marked</Badge> : <Badge variant="outline">Pending</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.recordId && (
                          <Button size="sm" variant="outline" disabled={unmarkingId === r.recordId} onClick={() => handleUnmark(r.recordId)} className="gap-1">
                            <Undo2 size={14} /> {unmarkingId === r.recordId ? 'Unmarking...' : 'Unmark'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && !isLoading && (
                  <TableRow><TableCell colSpan={12} className="text-center py-6 text-gray-500">No deliveries due for this date and filters.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {rows.length > 0 && (
            <div className="flex justify-end mt-4">
              <Button onClick={handleSaveAll} disabled={saving} className="gap-2"><Save size={16} /> {saving ? 'Saving...' : 'Save Delivery'}</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
