import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Wallet, Plus, Minus, Search, RotateCcw, Download, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const emptyFilters = { name: '', customerType: '', email: '', walletAmount: '', deliveryBoyId: '', deliveryType: '', subscriptionStatus: '', city: '' };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function WalletReport() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const canCreate = can('wallet_report', 'canCreate');
  const canExcel = can('wallet_report', 'canExcel');
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState(false);

  const { data: deliveryBoys = [] } = useQuery({ queryKey: ['deliveryBoysLite'], queryFn: async () => (await api.get('/admin/delivery-boys')).data.data });
  const { data: deliveryModes = [] } = useQuery({ queryKey: ['deliveryModesActive'], queryFn: async () => (await api.get('/admin/delivery-modes', { params: { activeOnly: 'true' } })).data.data });

  const queryKey = ['walletReport', applied, page, pageSize];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v; });
      return (await api.get('/admin/wallet/report', { params })).data.data;
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
      const params: Record<string, string> = {};
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/admin/wallet/report/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `customer-wallet-report-${Date.now()}.csv`);
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
            <Wallet className="text-blue-600" /> Customer Wallet Report
          </h2>
          <p className="text-gray-500 mt-1">Every customer's wallet balance, with quick actions to add or debit money.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canCreate && (
            <>
              <Button onClick={() => navigate('/wallet/add-money')} className="gap-2"><Plus size={16} /> Add Money to Customer Wallet</Button>
              <Button variant="destructive" onClick={() => navigate('/wallet/debit-money')} className="gap-2"><Minus size={16} /> Debit Money from Customer Wallet</Button>
            </>
          )}
          {canExcel && (
            <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-2">
              <Download size={16} /> {exporting ? 'Exporting...' : 'Export to Excel'}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-gray-100 pt-4">
          <Field label="Customer Name">
            <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </Field>
          <Field label="Customer Type">
            <Select value={draft.customerType} onChange={(e) => setDraft((d) => ({ ...d, customerType: e.target.value }))}>
              <option value="">All Types</option>
              <option value="prepaid">Prepaid</option>
              <option value="postpaid">Postpaid</option>
            </Select>
          </Field>
          <Field label="Email">
            <Input value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
          </Field>
          <Field label="Wallet Amount">
            <Select value={draft.walletAmount} onChange={(e) => setDraft((d) => ({ ...d, walletAmount: e.target.value }))}>
              <option value="">All</option>
              <option value="negative">Negative</option>
              <option value="zero">Zero</option>
              <option value="positive">Positive</option>
            </Select>
          </Field>
          <Field label="Delivery Boy">
            <Select value={draft.deliveryBoyId} onChange={(e) => setDraft((d) => ({ ...d, deliveryBoyId: e.target.value }))}>
              <option value="">All Delivery Boys</option>
              {deliveryBoys.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          <Field label="Delivery Type">
            <Select value={draft.deliveryType} onChange={(e) => setDraft((d) => ({ ...d, deliveryType: e.target.value }))}>
              <option value="">All</option>
              {deliveryModes.map((m: any) => <option key={m.id} value={m.name}>{m.name}</option>)}
            </Select>
          </Field>
          <Field label="Subscription Status">
            <Select value={draft.subscriptionStatus} onChange={(e) => setDraft((d) => ({ ...d, subscriptionStatus: e.target.value }))}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
              <option value="none">No Subscription</option>
            </Select>
          </Field>
          <Field label="City">
            <Input value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} />
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
              <CardTitle>Customer Wallet Report</CardTitle>
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
                <TableHead>Customer ID</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Wallet Amount</TableHead>
                <TableHead className="text-right">Refund</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-blue-600 font-medium">{c.code}</TableCell>
                  <TableCell>
                    <span className="font-medium text-gray-900 block">{c.name}</span>
                    <Badge variant="outline" className="text-[10px] capitalize mt-0.5">{c.customerType}</Badge>
                  </TableCell>
                  <TableCell className="text-gray-800">{c.mobile}</TableCell>
                  <TableCell className="text-gray-700">{c.email || '—'}</TableCell>
                  <TableCell className="text-gray-600 max-w-[220px] truncate" title={c.address}>{c.address || '—'}</TableCell>
                  <TableCell className={`text-right font-medium ${c.walletAmount < 0 ? 'text-red-600' : 'text-gray-900'}`}>₹{c.walletAmount}</TableCell>
                  <TableCell className="text-right text-gray-700">{c.refund ? `₹${c.refund}` : '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/wallet/customer/${c.id}`)} title="View transactions">
                      <Eye size={16} className="text-gray-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-gray-500">No results found.</TableCell></TableRow>
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
