import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Users2, Search, RotateCcw, Save, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

const emptyFilters = { name: '', customerType: '', routeId: '', deliveryBoyId: '', hubId: '', subscriptionStatus: '', routeNotAssigned: false };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function RouteWiseCustomers() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [edits, setEdits] = useState<Record<string, { routeId?: string; deliveryBoyId?: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data: hubs = [] } = useQuery({ queryKey: ['hubsLite'], queryFn: async () => (await api.get('/admin/hubs')).data.data });
  const { data: routes = [] } = useQuery({ queryKey: ['routesLite'], queryFn: async () => (await api.get('/admin/routes')).data.data });
  const { data: deliveryBoys = [] } = useQuery({ queryKey: ['deliveryBoysLite'], queryFn: async () => (await api.get('/admin/delivery-boys')).data.data });

  const queryKey = ['routeWiseCustomers', applied, page, pageSize];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
      Object.entries(applied).forEach(([k, v]) => { if (v === '' || v === false) return; params[k] = String(v); });
      return (await api.get('/admin/customers', { params })).data.data;
    }
  });

  const rows = data?.rows || [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleSearch = () => { setApplied(draft); setPage(1); };
  const handleReset = () => { setDraft(emptyFilters); setApplied(emptyFilters); setPage(1); };

  const handleSave = async (customerId: string) => {
    const edit = edits[customerId];
    if (!edit) return;
    setSavingId(customerId);
    try {
      const payload: any = {};
      if (edit.routeId !== undefined) payload.routeId = edit.routeId || null;
      if (edit.deliveryBoyId !== undefined) payload.deliveryBoyId = edit.deliveryBoyId || null;
      await api.patch(`/admin/customers/${customerId}`, payload);
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
      link.setAttribute('download', `route-wise-customers-${Date.now()}.csv`);
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
            <Users2 className="text-blue-600" /> Route-wise Customers
          </h2>
          <p className="text-gray-500 mt-1">Review and reassign the route and delivery boy each customer is served by.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-2">
          <Download size={16} /> {exporting ? 'Exporting...' : 'Export to Excel'}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 border-t border-gray-100 pt-4">
          <Field label="Search Customer">
            <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Name or mobile" />
          </Field>
          <Field label="Customer Type">
            <Select value={draft.customerType} onChange={(e) => setDraft((d) => ({ ...d, customerType: e.target.value }))}>
              <option value="">All Types</option>
              <option value="prepaid">Prepaid</option>
              <option value="postpaid">Postpaid</option>
            </Select>
          </Field>
          <Field label="Hub">
            <Select value={draft.hubId} onChange={(e) => setDraft((d) => ({ ...d, hubId: e.target.value }))}>
              <option value="">All Hubs</option>
              {hubs.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </Select>
          </Field>
          <Field label="Route">
            <Select
              value={draft.routeId}
              disabled={draft.routeNotAssigned}
              onChange={(e) => setDraft((d) => ({ ...d, routeId: e.target.value, routeNotAssigned: false }))}
            >
              <option value="">All Routes</option>
              {routes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
            <label className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
              <input type="checkbox" checked={draft.routeNotAssigned} onChange={(e) => setDraft((d) => ({ ...d, routeNotAssigned: e.target.checked, routeId: '' }))} />
              No Route Assigned only
            </label>
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
        </CardContent>
        <CardContent className="flex flex-wrap gap-3 pt-0">
          <Button onClick={handleSearch} className="gap-2"><Search size={16} /> Search</Button>
          <Button variant="outline" onClick={handleReset} className="gap-2"><RotateCcw size={16} /> Reset</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <CardTitle>Route-wise Customers</CardTitle>
              <CardDescription>{isLoading ? 'Loading...' : `Displaying ${rows.length} of ${total} results`}</CardDescription>
            </div>
            <Field label="Page size">
              <Select value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="w-auto">
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </Select>
            </Field>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Hub</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Delivery Boy</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Save</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c: any) => {
                const edit = edits[c.id] || {};
                const routeVal = edit.routeId !== undefined ? edit.routeId : (c.routeId || '');
                const boyVal = edit.deliveryBoyId !== undefined ? edit.deliveryBoyId : (c.deliveryBoyId || '');
                const dirty = edit.routeId !== undefined || edit.deliveryBoyId !== undefined;
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <span className="font-medium text-gray-900 block">{c.code ? `${c.code} - ${c.name}` : c.name}</span>
                    </TableCell>
                    <TableCell className="text-gray-800">{c.phone}</TableCell>
                    <TableCell className="text-gray-700">{c.hub || <Badge variant="destructive">No Hub</Badge>}</TableCell>
                    <TableCell className="text-gray-600 max-w-xs truncate" title={c.address}>{c.address || '—'}</TableCell>
                    <TableCell>
                      <Select className="w-40" value={routeVal} onChange={(e) => setEdits((ed) => ({ ...ed, [c.id]: { ...ed[c.id], routeId: e.target.value } }))}>
                        <option value="">No Route Assigned</option>
                        {routes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select className="w-40" value={boyVal} onChange={(e) => setEdits((ed) => ({ ...ed, [c.id]: { ...ed[c.id], deliveryBoyId: e.target.value } }))}>
                        <option value="">Not Assigned</option>
                        {deliveryBoys.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </Select>
                    </TableCell>
                    <TableCell>{c.isActive ? <Badge variant="success">Activated</Badge> : <Badge variant="outline">Deactivated</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" disabled={!dirty || savingId === c.id} onClick={() => handleSave(c.id)} className="gap-1">
                        <Save size={14} /> {savingId === c.id ? 'Saving...' : 'Save'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-gray-500">No customers found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="gap-1"><ChevronLeft size={16} /> Prev</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="gap-1">Next <ChevronRight size={16} /></Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
