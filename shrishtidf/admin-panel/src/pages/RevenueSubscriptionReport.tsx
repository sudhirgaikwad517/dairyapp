import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { RefreshCw, Search, RotateCcw, Download, IndianRupee, Users, TrendingUp, TrendingDown } from 'lucide-react';
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

function defaultDates() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { dateFrom: fmt(from), dateTo: fmt(to) };
}

export default function RevenueSubscriptionReport() {
  const [draft, setDraft] = useState({ ...defaultDates(), hubId: '' });
  const [applied, setApplied] = useState(draft);
  const [exporting, setExporting] = useState(false);

  const { data: hubs = [] } = useQuery({ queryKey: ['hubsLite'], queryFn: async () => (await api.get('/admin/hubs')).data.data });

  const { data, isLoading } = useQuery({
    queryKey: ['revenueSubscriptionReport', applied],
    queryFn: async () => {
      const params: Record<string, string> = {};
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v; });
      return (await api.get('/admin/reports/revenue-subscription', { params })).data.data;
    }
  });

  const rupee = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const handleSearch = () => setApplied(draft);
  const handleReset = () => { const d = { ...defaultDates(), hubId: '' }; setDraft(d); setApplied(d); };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = {};
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/admin/reports/revenue-subscription/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `revenue-subscription-report-${Date.now()}.csv`);
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
            <RefreshCw className="text-blue-600" /> Revenue Subscription Report
          </h2>
          <p className="text-gray-500 mt-1">Recurring value from active subscriptions, and new vs cancelled activity in the selected range.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-2">
          <Download size={16} /> {exporting ? 'Exporting...' : 'Export to Excel'}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 border-t border-gray-100 pt-4">
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
            <StatCard icon={IndianRupee} label="Active Recurring Value" value={rupee(summary.recurringValue)} tone="success" />
            <StatCard icon={Users} label="Active Subscriptions" value={summary.activeCount} />
            <StatCard icon={TrendingUp} label={`New (${data.range.from} to ${data.range.to})`} value={`${summary.newCount} · ${rupee(summary.newValue)}`} tone="success" />
            <StatCard icon={TrendingDown} label={`Cancelled (${data.range.from} to ${data.range.to})`} value={`${summary.cancelledCount} · ${rupee(summary.cancelledValue)}`} tone="danger" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">New Subscriptions Trend</CardTitle>
              <CardDescription>{applied.dateFrom} to {applied.dateTo}</CardDescription>
            </CardHeader>
            <CardContent className="border-t border-gray-100 pt-4">
              {data.dailyTrend.length === 0 ? (
                <p className="text-gray-500 text-sm py-10 text-center">No new subscriptions in this range.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data.dailyTrend} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="subRevenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} width={50} />
                    <Tooltip
                      formatter={(value: any, name: any) => [name === 'newValue' ? rupee(Number(value)) : value, name === 'newValue' ? 'New Value' : 'New Subscriptions']}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                    />
                    <Area type="monotone" dataKey="newValue" stroke="#059669" strokeWidth={2} fill="url(#subRevenueFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-lg">Active Value by Frequency</CardTitle></CardHeader>
              <CardContent className="border-t border-gray-100 pt-4">
                <Table>
                  <TableHeader><TableRow><TableHead>Frequency</TableHead><TableHead className="text-right">Subscriptions</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.frequencyBreakdown.map((f: any) => (
                      <TableRow key={f.frequency}>
                        <TableCell className="capitalize text-gray-700">{f.frequency.replace('_', ' ')}</TableCell>
                        <TableCell className="text-right">{f.count}</TableCell>
                        <TableCell className="text-right font-medium text-gray-900">{rupee(f.value)}</TableCell>
                      </TableRow>
                    ))}
                    {data.frequencyBreakdown.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center text-gray-500 py-6">No active subscriptions.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Active Value by Hub</CardTitle></CardHeader>
              <CardContent className="border-t border-gray-100 pt-4">
                <Table>
                  <TableHeader><TableRow><TableHead>Hub</TableHead><TableHead className="text-right">Subscriptions</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.hubBreakdown.map((h: any) => (
                      <TableRow key={h.hub}>
                        <TableCell className="text-gray-700">{h.hub}</TableCell>
                        <TableCell className="text-right">{h.count}</TableCell>
                        <TableCell className="text-right font-medium text-gray-900">{rupee(h.value)}</TableCell>
                      </TableRow>
                    ))}
                    {data.hubBreakdown.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center text-gray-500 py-6">No active subscriptions.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-lg">Top Products by Recurring Value</CardTitle></CardHeader>
            <CardContent className="border-t border-gray-100 pt-4">
              <Table>
                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Active Qty</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.topProducts.map((p: any) => (
                    <TableRow key={p.productName}>
                      <TableCell className="font-medium text-gray-900">{p.productName}</TableCell>
                      <TableCell className="text-right">{p.qty}</TableCell>
                      <TableCell className="text-right font-medium text-gray-900">{rupee(p.value)}</TableCell>
                    </TableRow>
                  ))}
                  {data.topProducts.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-gray-500 py-6">No active subscriptions.</TableCell></TableRow>
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
