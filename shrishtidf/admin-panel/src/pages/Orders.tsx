import { Fragment, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { cn } from '../lib/utils';
import { ShoppingCart, Search, RotateCcw, Download, XCircle, ReceiptText, FileText, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

const TABS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'IN_PROCESS', label: 'In Process' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'CANCELLED', label: 'Cancelled' }
];

const emptyFilters = { customerId: '', dateFrom: '', dateTo: '', deliveryBoyId: '', city: '' };

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
    case 'PENDING': return <Badge variant="warning">Pending</Badge>;
    case 'IN_PROCESS': return <Badge variant="default">In Process</Badge>;
    case 'SHIPPED': return <Badge variant="default">Shipped</Badge>;
    case 'DELIVERED': return <Badge variant="success">Delivered</Badge>;
    case 'CANCELLED': return <Badge variant="destructive">Cancelled</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

export default function Orders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('PENDING');
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState(false);
  const [expanded, setExpanded] = useState<{ id: string; type: 'items' | 'transaction' | 'cancel' } | null>(null);
  const [cancelNarration, setCancelNarration] = useState('');
  const [narrationDrafts, setNarrationDrafts] = useState<Record<string, string>>({});
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const { data: deliveryBoys = [] } = useQuery({ queryKey: ['deliveryBoysLite'], queryFn: async () => (await api.get('/admin/delivery-boys')).data.data });

  const queryKey = ['ecomOrders', tab, applied, page, pageSize];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), pageSize: String(pageSize), status: tab };
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v; });
      return (await api.get('/admin/orders', { params })).data.data;
    }
  });

  const { data: itemsDetail } = useQuery({
    queryKey: ['orderDetail', expanded?.id],
    queryFn: async () => (await api.get(`/admin/orders/${expanded!.id}`)).data.data,
    enabled: !!expanded
  });

  const rows = data?.rows || [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const totalAmount = data?.totalAmount ?? 0;

  const handleSearch = () => { setApplied(draft); setPage(1); };
  const handleReset = () => { setDraft(emptyFilters); setApplied(emptyFilters); setPage(1); };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = { status: tab };
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/admin/orders/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ecom-orders-${tab.toLowerCase()}-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const toggleExpand = (id: string, type: 'items' | 'transaction' | 'cancel') => {
    setExpanded((e) => (e?.id === id && e.type === type ? null : { id, type }));
    setCancelNarration('');
  };

  const confirmCancel = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.patch(`/admin/orders/${id}/cancel`, { narration: cancelNarration || undefined });
      await queryClient.invalidateQueries({ queryKey });
      setExpanded(null);
    } finally {
      setActionLoadingId(null);
    }
  };

  const saveNarration = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.patch(`/admin/orders/${id}/narration`, { narration: narrationDrafts[id] ?? '' });
      await queryClient.invalidateQueries({ queryKey });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <ShoppingCart className="text-blue-600" /> Ecom Orders
          </h2>
          <p className="text-gray-500 mt-1">Orders placed by customers through the website and app.</p>
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
          <Field label="Delivery Date From">
            <Input type="date" value={draft.dateFrom} onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))} />
          </Field>
          <Field label="Delivery Date To">
            <Input type="date" value={draft.dateTo} onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))} />
          </Field>
          <Field label="Delivery Boy">
            <Select value={draft.deliveryBoyId} onChange={(e) => setDraft((d) => ({ ...d, deliveryBoyId: e.target.value }))}>
              <option value="">Select Delivery Boy</option>
              {deliveryBoys.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          <Field label="City">
            <Input value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} placeholder="Search by city or address" />
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
              <CardTitle>Manage Customer Orders</CardTitle>
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order No</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Hub</TableHead>
                  <TableHead className="text-right">Total(Rs)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Delivery Boy</TableHead>
                  <TableHead>Narration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((o: any) => (
                  <Fragment key={o.id}>
                    <TableRow>
                      <TableCell className="font-mono text-blue-600 font-medium">{o.invoiceNumber}</TableCell>
                      <TableCell className="text-gray-600">{o.orderDate ? new Date(o.orderDate).toLocaleDateString('en-IN') : '—'}</TableCell>
                      <TableCell className="font-medium text-gray-900">{o.customerName}</TableCell>
                      <TableCell className="text-gray-700">{o.hub || '—'}</TableCell>
                      <TableCell className="text-right font-medium text-gray-900">₹{o.total}</TableCell>
                      <TableCell>{statusBadge(o.status)}</TableCell>
                      <TableCell className="text-gray-700">{o.deliveryBoy || '—'}</TableCell>
                      <TableCell className="text-gray-600 max-w-[160px] truncate" title={o.narration}>{o.narration || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title="View Items" onClick={() => toggleExpand(o.id, 'items')}>
                            <FileText size={16} className="text-gray-500" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Transaction Details" onClick={() => toggleExpand(o.id, 'transaction')}>
                            <ReceiptText size={16} className="text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" title="Edit Narration"
                            onClick={() => { setNarrationDrafts((d) => ({ ...d, [o.id]: o.narration || '' })); toggleExpand(o.id, 'transaction'); }}
                          >
                            <Edit size={16} className="text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="icon" title="View Bill" onClick={() => navigate(`/orders/${o.id}/bill`)}>
                            <ReceiptText size={16} className="text-emerald-600" />
                          </Button>
                          {o.status !== 'CANCELLED' && o.status !== 'DELIVERED' && (
                            <Button variant="ghost" size="icon" title="Cancel" onClick={() => toggleExpand(o.id, 'cancel')}>
                              <XCircle size={16} className="text-red-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    {expanded && expanded.id === o.id && expanded.type === 'items' && (
                      <TableRow>
                        <TableCell colSpan={9} className="bg-gray-50">
                          {itemsDetail ? (
                            <table className="w-full text-sm my-2">
                              <thead>
                                <tr className="text-left text-xs text-gray-500 uppercase">
                                  <th className="py-1">Product</th><th className="py-1">Size</th>
                                  <th className="py-1 text-right">Qty</th><th className="py-1 text-right">Rate</th><th className="py-1 text-right">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {itemsDetail.items.map((it: any) => (
                                  <tr key={it.id}>
                                    <td className="py-1 text-gray-900">{it.productName}</td>
                                    <td className="py-1 text-gray-600">{it.size}</td>
                                    <td className="py-1 text-right">{it.quantity}</td>
                                    <td className="py-1 text-right">₹{it.unitPrice}</td>
                                    <td className="py-1 text-right font-medium">₹{it.lineTotal}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : <p className="py-3 text-gray-500 text-sm">Loading items...</p>}
                        </TableCell>
                      </TableRow>
                    )}

                    {expanded && expanded.id === o.id && expanded.type === 'transaction' && (
                      <TableRow>
                        <TableCell colSpan={9} className="bg-gray-50">
                          {itemsDetail ? (
                            <div className="py-3 space-y-3">
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                                <div><p className="text-xs text-gray-500">Payment Method</p><p className="font-medium text-gray-900 uppercase">{itemsDetail.paymentMethod}</p></div>
                                <div><p className="text-xs text-gray-500">Payment Status</p><p className="font-medium text-gray-900 capitalize">{itemsDetail.paymentStatus}</p></div>
                                <div><p className="text-xs text-gray-500">Subtotal</p><p className="font-medium text-gray-900">₹{itemsDetail.subtotal}</p></div>
                                <div><p className="text-xs text-gray-500">Tax</p><p className="font-medium text-gray-900">₹{itemsDetail.taxAmount}</p></div>
                                <div><p className="text-xs text-gray-500">Delivery Fee</p><p className="font-medium text-gray-900">₹{itemsDetail.deliveryFee}</p></div>
                                <div><p className="text-xs text-gray-500">Wallet Used</p><p className="font-medium text-gray-900">₹{itemsDetail.walletAmountUsed}</p></div>
                                {itemsDetail.razorpayOrderId && <div><p className="text-xs text-gray-500">Razorpay Order</p><p className="font-medium text-gray-900">{itemsDetail.razorpayOrderId}</p></div>}
                                {itemsDetail.razorpayPaymentId && <div><p className="text-xs text-gray-500">Razorpay Payment</p><p className="font-medium text-gray-900">{itemsDetail.razorpayPaymentId}</p></div>}
                              </div>
                              <div className="flex items-end gap-2 max-w-md">
                                <div className="flex-1">
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Narration</label>
                                  <Input
                                    value={narrationDrafts[o.id] ?? o.narration ?? ''}
                                    onChange={(e) => setNarrationDrafts((d) => ({ ...d, [o.id]: e.target.value }))}
                                    placeholder="Add a note about this order"
                                  />
                                </div>
                                <Button size="sm" disabled={actionLoadingId === o.id} onClick={() => saveNarration(o.id)}>Save</Button>
                              </div>
                            </div>
                          ) : <p className="py-3 text-gray-500 text-sm">Loading transaction details...</p>}
                        </TableCell>
                      </TableRow>
                    )}

                    {expanded && expanded.id === o.id && expanded.type === 'cancel' && (
                      <TableRow>
                        <TableCell colSpan={9} className="bg-red-50/50">
                          <div className="flex flex-wrap items-end gap-3 py-2">
                            <div className="flex-1 min-w-[240px]">
                              <label className="block text-xs font-medium text-gray-500 mb-1">Reason (optional)</label>
                              <Input value={cancelNarration} onChange={(e) => setCancelNarration(e.target.value)} placeholder="Why is this order being cancelled?" />
                            </div>
                            <Button variant="destructive" disabled={actionLoadingId === o.id} onClick={() => confirmCancel(o.id)}>Confirm Cancel</Button>
                            <Button variant="outline" onClick={() => setExpanded(null)}>Dismiss</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
                {rows.length === 0 && !isLoading && (
                  <TableRow><TableCell colSpan={9} className="text-center py-6 text-gray-500">No results found.</TableCell></TableRow>
                )}
              </TableBody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="border-t border-gray-200 font-semibold">
                    <td className="py-2 px-4" colSpan={4}>Total</td>
                    <td className="py-2 px-4 text-right">₹{totalAmount}</td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              )}
            </Table>
          </div>

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
