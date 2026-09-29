import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { CalendarCheck, Search, RotateCcw, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

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

const STATUS_COLOR: Record<string, string> = { delivered: '#059669', not_delivered: '#dc2626' };

export default function MarkDeliveryReport() {
  const [filters, setFilters] = useState({ dateFrom: todayStr(), dateTo: todayStr(), deliveryBoyId: '', status: '' });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const { data: deliveryBoys = [] } = useQuery({ queryKey: ['deliveryBoysLite'], queryFn: async () => (await api.get('/admin/delivery-boys')).data.data });

  const queryKey = ['markDeliveryReport', applied, page];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), pageSize: '20' };
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v; });
      return (await api.get('/admin/reports/mark-delivery', { params })).data.data;
    }
  });

  const rows = data?.rows || [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const statusPie = useMemo(() => {
    const delivered = rows.filter((r: any) => r.status === 'delivered').length;
    const notDelivered = rows.length - delivered;
    return [
      { name: 'Delivered', key: 'delivered', value: delivered },
      { name: 'Not Delivered', key: 'not_delivered', value: notDelivered }
    ].filter((d) => d.value > 0);
  }, [rows]);

  const handleSearch = () => { setApplied(filters); setPage(1); };
  const handleReset = () => { const d = { dateFrom: todayStr(), dateTo: todayStr(), deliveryBoyId: '', status: '' }; setFilters(d); setApplied(d); setPage(1); };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = {};
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/admin/reports/mark-delivery/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mark-delivery-report-${Date.now()}.csv`);
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
            <CalendarCheck className="text-blue-600" /> Mark Delivery Report
          </h2>
          <p className="text-gray-500 mt-1">Historical record of every delivery marked, across any date range.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-2">
          <Download size={16} /> {exporting ? 'Exporting...' : 'Export to Excel'}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-gray-100 pt-4">
          <Field label="Date From">
            <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
          </Field>
          <Field label="Date To">
            <Input type="date" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} />
          </Field>
          <Field label="Delivery Boy">
            <Select value={filters.deliveryBoyId} onChange={(e) => setFilters((f) => ({ ...f, deliveryBoyId: e.target.value }))}>
              <option value="">All Delivery Boys</option>
              {deliveryBoys.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
              <option value="">All</option>
              <option value="delivered">Delivered</option>
              <option value="not_delivered">Not Delivered</option>
            </Select>
          </Field>
        </CardContent>
        <CardContent className="flex flex-wrap gap-3 pt-0">
          <Button onClick={handleSearch} className="gap-2"><Search size={16} /> Search</Button>
          <Button variant="outline" onClick={handleReset} className="gap-2"><RotateCcw size={16} /> Reset</Button>
        </CardContent>
      </Card>

      {statusPie.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Delivered vs Not Delivered (this page)</CardTitle></CardHeader>
          <CardContent className="border-t border-gray-100 pt-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {statusPie.map((d) => <Cell key={d.key} fill={STATUS_COLOR[d.key]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Deliveries</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : `Displaying ${rows.length} of ${total} results`}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Delivery Boy</TableHead>
                <TableHead className="text-right">Ordered</TableHead>
                <TableHead className="text-right">Delivered</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">Bottles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Remark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium text-gray-900">{r.customerName}</TableCell>
                  <TableCell className="text-gray-600">{new Date(r.deliveryDate).toLocaleDateString('en-IN')}</TableCell>
                  <TableCell className="text-gray-700">{r.product}</TableCell>
                  <TableCell className="text-gray-700">{r.deliveryBoy}</TableCell>
                  <TableCell className="text-right">{r.quantityOrdered}</TableCell>
                  <TableCell className="text-right">{r.quantityDelivered}</TableCell>
                  <TableCell className={`text-right ${r.pendingQty !== 0 ? 'text-amber-600' : ''}`}>{r.pendingQty}</TableCell>
                  <TableCell className="text-right">{r.bottlesCollected}</TableCell>
                  <TableCell>{r.status === 'delivered' ? <Badge variant="success">Delivered</Badge> : <Badge variant="destructive">Not Delivered</Badge>}</TableCell>
                  <TableCell className="text-gray-600 max-w-[160px] truncate" title={r.remark}>{r.remark || '—'}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={10} className="text-center py-6 text-gray-500">No results found.</TableCell></TableRow>
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
