import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Receipt, Plus, Search, RotateCcw, Download, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const emptyFilters = { customerId: '', status: '', dateFrom: '', dateTo: '' };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function CustomerBilling() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const canCreate = can('customer_billing', 'canCreate');
  const canUpdate = can('customer_billing', 'canUpdate');
  const canExcel = can('customer_billing', 'canExcel');
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState(false);

  const queryKey = ['customerBilling', applied, page, pageSize];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v; });
      return (await api.get('/admin/wallet/billing', { params })).data.data;
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
      const res = await api.get('/admin/wallet/billing/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `customer-billing-${Date.now()}.csv`);
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
            <Receipt className="text-blue-600" /> Customer Billing
          </h2>
          <p className="text-gray-500 mt-1">Postpaid billing cycles — remaining amount and status are calculated automatically from bill and paid amounts.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canExcel && (
            <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-2">
              <Download size={16} /> {exporting ? 'Exporting...' : 'Export to Excel'}
            </Button>
          )}
          {canCreate && <Button onClick={() => navigate('/wallet/billing/new')} className="gap-2"><Plus size={16} /> Add New Billing</Button>}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-gray-100 pt-4">
          <Field label="Date From">
            <Input type="date" value={draft.dateFrom} onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))} />
          </Field>
          <Field label="Date To">
            <Input type="date" value={draft.dateTo} onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))} />
          </Field>
          <Field label="Status">
            <Select value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
              <option value="">All</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
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
              <CardTitle>Manage Customer Billing</CardTitle>
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
                <TableHead>From Date</TableHead>
                <TableHead>To Date</TableHead>
                <TableHead className="text-right">Bill Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium text-gray-900">{b.customerCode} - {b.customerName}</TableCell>
                  <TableCell className="text-gray-600">{new Date(b.fromDate).toLocaleDateString('en-IN')}</TableCell>
                  <TableCell className="text-gray-600">{new Date(b.toDate).toLocaleDateString('en-IN')}</TableCell>
                  <TableCell className="text-right text-gray-900 font-medium">₹{b.billAmount}</TableCell>
                  <TableCell className="text-right text-gray-700">₹{b.paidAmount}</TableCell>
                  <TableCell className={`text-right font-medium ${b.remainingAmount > 0 ? 'text-red-600' : 'text-gray-700'}`}>₹{b.remainingAmount}</TableCell>
                  <TableCell>{b.status === 'paid' ? <Badge variant="success">Paid</Badge> : <Badge variant="destructive">Unpaid</Badge>}</TableCell>
                  <TableCell className="text-right">
                    {canUpdate && (
                      <Button variant="ghost" size="icon" className="text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={() => navigate(`/wallet/billing/${b.id}`)}>
                        <Edit size={16} />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-gray-500">No billing records found.</TableCell></TableRow>
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
