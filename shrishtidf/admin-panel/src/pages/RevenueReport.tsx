import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { BarChart3, Search, RotateCcw, Download, IndianRupee, ShoppingCart, Package, Ban } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone = 'default' }: { icon: any; label: string; value: React.ReactNode; tone?: 'default' | 'danger' | 'success' }) {
  const toneClass = tone === 'danger' ? 'bg-red-50 border-red-200 text-red-600' : tone === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-blue-50 border-blue-200 text-blue-600';
  return (
    <Card>
      <CardContent className="pt-6 flex items-center gap-4">
        <div className={`p-3 rounded-lg border ${toneClass}`}><Icon size={20} /></div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
          <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function statusLabel(status: string) {
  return status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const STATUS_TONE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  PENDING: 'warning', IN_PROCESS: 'default', SHIPPED: 'default', DELIVERED: 'success', CANCELLED: 'destructive'
};

function defaultDates() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { dateFrom: fmt(from), dateTo: fmt(to) };
}

export default function RevenueReport() {
  const [draft, setDraft] = useState({ ...defaultDates(), city: '', hubId: '' });
  const [applied, setApplied] = useState(draft);
  const [exporting, setExporting] = useState(false);

  const { data: hubs = [] } = useQuery({ queryKey: ['hubsLite'], queryFn: async () => (await api.get('/admin/hubs')).data.data });

  const { data, isLoading } = useQuery({
    queryKey: ['revenueReport', applied],
    queryFn: async () => {
      const params: Record<string, string> = {};
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v; });
      return (await api.get('/admin/reports/revenue', { params })).data.data;
    }
  });

  const rupee = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const handleSearch = () => setApplied(draft);
  const handleReset = () => { const d = { ...defaultDates(), city: '', hubId: '' }; setDraft(d); setApplied(d); };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = {};
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/admin/reports/revenue/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `revenue-report-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <BarChart3 className="text-blue-600" /> Revenue Order Report
          </h2>
          <p className="text-gray-500 mt-1">Sales performance for orders placed through the website and app.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-2">
          <Download size={16} /> {exporting ? 'Exporting...' : 'Export to Excel'}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-gray-100 pt-4">
          <Field label="From Date">
            <Input type="date" value={draft.dateFrom} onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))} />
          </Field>
          <Field label="To Date">
            <Input type="date" value={draft.dateTo} onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))} />
          </Field>
          <Field label="Hub">
            <Select value={draft.hubId} onChange={(e) => setDraft((d) => ({ ...d, hubId: e.target.value }))}>
              <option value="">All Hubs</option>
              {hubs.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
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

      {isLoading && <div className="text-gray-500">Loading report...</div>}

      {summary && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={IndianRupee} label="Total Revenue" value={rupee(summary.totalRevenue)} tone="success" />
            <StatCard icon={ShoppingCart} label="Live Orders" value={summary.liveOrders} />
            <StatCard icon={Package} label="Avg. Order Value" value={rupee(summary.avgOrderValue)} />
            <StatCard icon={Ban} label="Cancelled Orders" value={`${summary.cancelledOrders} (${rupee(summary.cancelledRevenueLost)} lost)`} tone="danger" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Revenue Trend</CardTitle>
              <CardDescription>{applied.dateFrom} to {applied.dateTo}</CardDescription>
            </CardHeader>
            <CardContent className="border-t border-gray-100 pt-4">
              {data.dailyTrend.length === 0 ? (
                <p className="text-gray-500 text-sm py-10 text-center">No orders in this range.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data.dailyTrend} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} width={50} />
                    <Tooltip
                      formatter={(value: any, name: any) => [name === 'revenue' ? rupee(Number(value)) : value, name === 'revenue' ? 'Revenue' : 'Orders']}
                      labelStyle={{ color: '#111827' }}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fill="url(#revenueFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-lg">Orders by Status</CardTitle></CardHeader>
              <CardContent className="border-t border-gray-100 pt-4">
                <Table>
                  <TableHeader><TableRow><TableHead>Status</TableHead><TableHead className="text-right">Orders</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.statusBreakdown.map((s: any) => (
                      <TableRow key={s.status}>
                        <TableCell><Badge variant={STATUS_TONE[s.status] || 'outline'}>{statusLabel(s.status)}</Badge></TableCell>
                        <TableCell className="text-right">{s.count}</TableCell>
                        <TableCell className="text-right font-medium text-gray-900">{rupee(s.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Payment Method Breakdown</CardTitle></CardHeader>
              <CardContent className="border-t border-gray-100 pt-4">
                <Table>
                  <TableHeader><TableRow><TableHead>Method</TableHead><TableHead className="text-right">Orders</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.paymentBreakdown.map((p: any) => (
                      <TableRow key={p.method}>
                        <TableCell className="uppercase text-gray-700">{p.method}</TableCell>
                        <TableCell className="text-right">{p.count}</TableCell>
                        <TableCell className="text-right font-medium text-gray-900">{rupee(p.revenue)}</TableCell>
                      </TableRow>
                    ))}
                    {data.paymentBreakdown.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center text-gray-500 py-6">No orders in this range.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-lg">Top Products</CardTitle></CardHeader>
            <CardContent className="border-t border-gray-100 pt-4">
              <Table>
                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Qty Sold</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.topProducts.map((p: any) => (
                    <TableRow key={p.productName}>
                      <TableCell className="font-medium text-gray-900">{p.productName}</TableCell>
                      <TableCell className="text-right">{p.qty}</TableCell>
                      <TableCell className="text-right font-medium text-gray-900">{rupee(p.revenue)}</TableCell>
                    </TableRow>
                  ))}
                  {data.topProducts.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-gray-500 py-6">No orders in this range.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
