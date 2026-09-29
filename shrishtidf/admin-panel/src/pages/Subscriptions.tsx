import { Fragment, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { cn } from '../lib/utils';
import { Calendar, Search, RotateCcw, Download, Pause, Play, XCircle, Ban, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

const TABS = [
  { key: 'active', label: 'Active' },
  { key: 'hold', label: 'Hold' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'expired', label: 'Expired' }
];

const emptyFilters = { customerId: '', customerType: '', hubId: '', productId: '', deliveryModeId: '', city: '', area: '', deliveryBoyId: '' };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function statusBadge(status: string) {
  switch (status) {
    case 'active': return <Badge variant="success">Active</Badge>;
    case 'paused': return <Badge variant="warning">Hold</Badge>;
    case 'inactive': return <Badge variant="outline">Inactive</Badge>;
    case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
    case 'expired': return <Badge variant="outline">Expired</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

export default function Subscriptions() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('active');
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelReasonId, setCancelReasonId] = useState('');
  const [cancelNote, setCancelNote] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const { data: hubs = [] } = useQuery({ queryKey: ['hubsLite'], queryFn: async () => (await api.get('/admin/hubs')).data.data });
  const { data: deliveryBoys = [] } = useQuery({ queryKey: ['deliveryBoysLite'], queryFn: async () => (await api.get('/admin/delivery-boys')).data.data });
  const { data: deliveryModes = [] } = useQuery({ queryKey: ['deliveryModesActive'], queryFn: async () => (await api.get('/admin/delivery-modes', { params: { activeOnly: 'true' } })).data.data });
  const { data: cancelReasons = [] } = useQuery({ queryKey: ['cancelReasonsActive'], queryFn: async () => (await api.get('/admin/cancel-reasons', { params: { status: 'active' } })).data.data });

  const queryKey = ['subscriptionsList', tab, applied, page, pageSize];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), pageSize: String(pageSize), status: tab };
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v; });
      return (await api.get('/admin/subscriptions', { params })).data.data;
    }
  });

  const rows = data?.rows || [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleSearch = () => { setApplied(draft); setPage(1); };
  const handleReset = () => { setDraft(emptyFilters); setApplied(emptyFilters); setPage(1); };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = { status: tab };
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/admin/subscriptions/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `subscriptions-${tab}-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const runAction = async (id: string, fn: () => Promise<any>) => {
    setActionLoadingId(id);
    try {
      await fn();
      await queryClient.invalidateQueries({ queryKey });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePause = (id: string) => runAction(id, () => api.patch(`/admin/subscriptions/${id}/pause`, {}));
  const handleResume = (id: string) => runAction(id, () => api.patch(`/admin/subscriptions/${id}/resume`, {}));
  const handleInactive = (id: string) => runAction(id, () => api.patch(`/admin/subscriptions/${id}/inactive`, {}));

  const openCancel = (id: string) => { setCancelingId(id); setCancelReasonId(''); setCancelNote(''); };
  const confirmCancel = async () => {
    if (!cancelingId) return;
    await runAction(cancelingId, () => api.patch(`/admin/subscriptions/${cancelingId}/cancel`, { cancelReasonId: cancelReasonId || undefined, cancelNote: cancelNote || undefined }));
    setCancelingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Calendar className="text-blue-600" /> Subscriptions
          </h2>
          <p className="text-gray-500 mt-1">Manage recurring deliveries for customers.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-2">
          <Download size={16} /> {exporting ? 'Exporting...' : 'Export to Excel'}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(1); }}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-gray-100 pt-4">
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
          <Field label="Delivery Type">
            <Select value={draft.deliveryModeId} onChange={(e) => setDraft((d) => ({ ...d, deliveryModeId: e.target.value }))}>
              <option value="">All</option>
              {deliveryModes.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Delivery Boy">
            <Select value={draft.deliveryBoyId} onChange={(e) => setDraft((d) => ({ ...d, deliveryBoyId: e.target.value }))}>
              <option value="">All Delivery Boys</option>
              {deliveryBoys.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          <Field label="City">
            <Input value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} />
          </Field>
          <Field label="Area Name">
            <Input value={draft.area} onChange={(e) => setDraft((d) => ({ ...d, area: e.target.value }))} />
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
              <CardTitle>Subscription List</CardTitle>
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
                <TableHead>Delivery Boy</TableHead>
                <TableHead>Subscription Date</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Packaging</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Delivery Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s: any) => (
                <Fragment key={s.id}>
                  <TableRow>
                    <TableCell>
                      <span className="font-medium text-gray-900 block">{s.customerCode} - {s.customerName}</span>
                      <Badge variant="outline" className="text-[10px] capitalize mt-0.5">{s.customerType}</Badge>
                    </TableCell>
                    <TableCell className="text-gray-800">{s.mobile}</TableCell>
                    <TableCell className="text-gray-700">{s.hub || '—'}</TableCell>
                    <TableCell className="text-gray-700">{s.deliveryBoy || '—'}</TableCell>
                    <TableCell className="text-gray-600">{s.subscriptionDate ? String(s.subscriptionDate).slice(0, 10) : '—'}</TableCell>
                    <TableCell className="text-gray-600">{s.startDate ? String(s.startDate).slice(0, 10) : '—'}</TableCell>
                    <TableCell className="text-gray-800">{s.productName}</TableCell>
                    <TableCell className="text-gray-700">{s.packaging || '—'}</TableCell>
                    <TableCell className="text-right font-medium text-gray-900">{s.qty}</TableCell>
                    <TableCell className="text-right text-gray-700">{s.rate ?? '—'}</TableCell>
                    <TableCell className="text-gray-700">{s.deliveryType || '—'}</TableCell>
                    <TableCell>{statusBadge(s.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {(s.status === 'active' || s.status === 'expired') && (
                          <Button variant="ghost" size="icon" disabled={actionLoadingId === s.id} className="text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700" title="Hold" onClick={() => handlePause(s.id)}>
                            <Pause size={16} />
                          </Button>
                        )}
                        {(s.status === 'paused' || s.status === 'inactive') && (
                          <Button variant="ghost" size="icon" disabled={actionLoadingId === s.id} className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700" title="Resume" onClick={() => handleResume(s.id)}>
                            <Play size={16} />
                          </Button>
                        )}
                        {(s.status === 'active' || s.status === 'expired') && (
                          <Button variant="ghost" size="icon" disabled={actionLoadingId === s.id} className="text-gray-600 hover:bg-gray-100 hover:text-gray-800" title="Mark Inactive" onClick={() => handleInactive(s.id)}>
                            <Ban size={16} />
                          </Button>
                        )}
                        {s.status !== 'cancelled' && (
                          <Button variant="ghost" size="icon" disabled={actionLoadingId === s.id} className="text-red-600 hover:bg-red-50 hover:text-red-700" title="Cancel" onClick={() => openCancel(s.id)}>
                            <XCircle size={16} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {cancelingId === s.id && (
                    <TableRow>
                      <TableCell colSpan={13} className="bg-red-50/50">
                        <div className="flex flex-wrap items-end gap-3 py-2">
                          <div className="min-w-[220px]">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Cancel Reason</label>
                            <Select value={cancelReasonId} onChange={(e) => setCancelReasonId(e.target.value)}>
                              <option value="">Select reason (optional)</option>
                              {cancelReasons.map((r: any) => <option key={r.id} value={r.id}>{r.reason}</option>)}
                            </Select>
                          </div>
                          <div className="flex-1 min-w-[220px]">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Note</label>
                            <Input value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} placeholder="Optional note" />
                          </div>
                          <Button variant="destructive" onClick={confirmCancel} disabled={actionLoadingId === s.id}>Confirm Cancel</Button>
                          <Button variant="outline" onClick={() => setCancelingId(null)}>Dismiss</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={13} className="text-center py-6 text-gray-500">No subscriptions found.</TableCell></TableRow>
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
