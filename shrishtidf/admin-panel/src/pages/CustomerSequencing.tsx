import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ListOrdered, Search, RotateCcw, Save, Download } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

const emptyFilters = { city: '', hubId: '', deliveryBoyId: '', subscriptionStatus: '', sequenceNotAssigned: false };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function CustomerSequencing() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data: hubs = [] } = useQuery({ queryKey: ['hubsLite'], queryFn: async () => (await api.get('/admin/hubs')).data.data });
  const { data: deliveryBoys = [] } = useQuery({ queryKey: ['deliveryBoysLite'], queryFn: async () => (await api.get('/admin/delivery-boys')).data.data });

  const queryKey = ['customerSequencing', applied];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string, string> = { page: '1', pageSize: '200' };
      Object.entries(applied).forEach(([k, v]) => { if (v === '' || v === false) return; params[k] = String(v); });
      return (await api.get('/admin/customers', { params })).data.data;
    }
  });

  const rows = data?.rows || [];
  const total = data?.total ?? 0;

  const handleSearch = () => setApplied(draft);
  const handleReset = () => { setDraft(emptyFilters); setApplied(emptyFilters); };

  const handleSave = async (customerId: string) => {
    const value = edits[customerId];
    if (value === undefined) return;
    setSavingId(customerId);
    try {
      await api.patch(`/admin/customers/${customerId}`, { deliverySequence: Number(value) || 0 });
      await queryClient.invalidateQueries({ queryKey });
      setEdits((e) => { const next = { ...e }; delete next[customerId]; return next; });
    } finally {
      setSavingId(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = {};
      Object.entries(applied).forEach(([k, v]) => { if (v === '' || v === false) return; params[k] = String(v); });
      const res = await api.get('/admin/customers/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `customer-sequencing-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <ListOrdered className="text-blue-600" /> Customer Sequencing
          </h2>
          <p className="text-gray-500 mt-1">Set the stop order a delivery boy should follow along their route.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-2">
          <Download size={16} /> {exporting ? 'Exporting...' : 'Export to Excel'}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-gray-100 pt-4">
          <Field label="City">
            <Input value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} />
          </Field>
          <Field label="Hub">
            <Select value={draft.hubId} onChange={(e) => setDraft((d) => ({ ...d, hubId: e.target.value }))}>
              <option value="">All Hubs</option>
              {hubs.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </Select>
          </Field>
          <Field label="Delivery Boy">
            <Select value={draft.deliveryBoyId} onChange={(e) => setDraft((d) => ({ ...d, deliveryBoyId: e.target.value }))}>
              <option value="">All Delivery Boys</option>
              {deliveryBoys.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          <Field label="Subscription Status">
            <Select value={draft.subscriptionStatus} onChange={(e) => setDraft((d) => ({ ...d, subscriptionStatus: e.target.value }))}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>
          <div className="lg:col-span-4">
            <label className="flex items-center gap-1.5 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={draft.sequenceNotAssigned}
                onChange={(e) => setDraft((d) => ({ ...d, sequenceNotAssigned: e.target.checked }))}
              />
              Delivery Sequence Not Assigned only
            </label>
          </div>
        </CardContent>
        <CardContent className="flex flex-wrap gap-3 pt-0">
          <Button onClick={handleSearch} className="gap-2"><Search size={16} /> Search</Button>
          <Button variant="outline" onClick={handleReset} className="gap-2"><RotateCcw size={16} /> Reset</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customers Delivery Sequence</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : `Total ${total} results`}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Hub</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Delivery Boy</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Delivery Sequence</TableHead>
                <TableHead className="text-right">Save</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-gray-900">{c.name || 'Unnamed'}</TableCell>
                  <TableCell className="text-gray-800">{c.phone}</TableCell>
                  <TableCell className="text-gray-700">{c.hub || <Badge variant="destructive">No Hub</Badge>}</TableCell>
                  <TableCell className="text-gray-700">{c.route || <Badge variant="destructive">No Route</Badge>}</TableCell>
                  <TableCell className="text-gray-700">{c.deliveryBoy || <Badge variant="destructive">Not Assigned</Badge>}</TableCell>
                  <TableCell>{c.isActive ? <Badge variant="success">Activated</Badge> : <Badge variant="outline">Deactivated</Badge>}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-24"
                      value={edits[c.id] !== undefined ? edits[c.id] : String(c.deliverySequence ?? 0)}
                      onChange={(e) => setEdits((ed) => ({ ...ed, [c.id]: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={edits[c.id] === undefined || savingId === c.id}
                      onClick={() => handleSave(c.id)}
                      className="gap-1"
                    >
                      <Save size={14} /> {savingId === c.id ? 'Saving...' : 'Save'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-gray-500">No customers found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
