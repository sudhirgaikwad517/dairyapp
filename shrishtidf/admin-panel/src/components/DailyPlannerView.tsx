import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Search, RotateCcw, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

type GroupBy = 'none' | 'hub' | 'deliveryBoy';

export default function DailyPlannerView({
  title, description, groupBy, pendingOnly, exportFilename
}: {
  title: string;
  description: string;
  groupBy: GroupBy;
  pendingOnly?: boolean;
  exportFilename: string;
}) {
  const [filters, setFilters] = useState({ date: todayStr(), deliveryBoyId: '', hubId: '', city: '', area: '' });
  const [applied, setApplied] = useState(filters);
  const [exporting, setExporting] = useState(false);

  const { data: deliveryBoys = [] } = useQuery({ queryKey: ['deliveryBoysLite'], queryFn: async () => (await api.get('/admin/delivery-boys')).data.data });
  const { data: hubs = [] } = useQuery({ queryKey: ['hubsLite'], queryFn: async () => (await api.get('/admin/hubs')).data.data });

  const queryKey = ['dailyPlanner', groupBy, pendingOnly, applied];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string, string> = { date: applied.date, groupBy };
      if (pendingOnly) params.pendingOnly = 'true';
      if (applied.deliveryBoyId) params.deliveryBoyId = applied.deliveryBoyId;
      if (applied.hubId) params.hubId = applied.hubId;
      if (applied.city) params.city = applied.city;
      if (applied.area) params.area = applied.area;
      return (await api.get('/admin/reports/daily-planner', { params })).data.data;
    }
  });

  const handleSearch = () => setApplied(filters);
  const handleReset = () => { const d = { date: todayStr(), deliveryBoyId: '', hubId: '', city: '', area: '' }; setFilters(d); setApplied(d); };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = { date: applied.date, groupBy };
      if (pendingOnly) params.pendingOnly = 'true';
      if (applied.deliveryBoyId) params.deliveryBoyId = applied.deliveryBoyId;
      if (applied.hubId) params.hubId = applied.hubId;
      if (applied.city) params.city = applied.city;
      if (applied.area) params.area = applied.area;
      const res = await api.get('/admin/reports/daily-planner/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${exportFilename}-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const isPivot = groupBy !== 'none';
  const chartData = isPivot ? (data?.rows || []).map((r: any) => ({ name: r.group, total: r.total })) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">{title}</h2>
          <p className="text-gray-500 mt-1">{description}</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-2">
          <Download size={16} /> {exporting ? 'Exporting...' : 'Export to Excel'}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 border-t border-gray-100 pt-4">
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
              <option value="">All Hubs</option>
              {hubs.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </Select>
          </Field>
          <Field label="City">
            <Input value={filters.city} onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))} />
          </Field>
          <Field label="Area">
            <Input value={filters.area} onChange={(e) => setFilters((f) => ({ ...f, area: e.target.value }))} />
          </Field>
        </CardContent>
        <CardContent className="flex flex-wrap gap-3 pt-0">
          <Button onClick={handleSearch} className="gap-2"><Search size={16} /> Search</Button>
          <Button variant="outline" onClick={handleReset} className="gap-2"><RotateCcw size={16} /> Reset</Button>
        </CardContent>
      </Card>

      {isPivot && chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Packets by {groupBy === 'hub' ? 'Hub' : 'Delivery Boy'}</CardTitle></CardHeader>
          <CardContent className="border-t border-gray-100 pt-4">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} width={40} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : isPivot ? `${data?.rows?.length || 0} groups` : `Total ${data?.total ?? 0} results`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {!isPivot ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Hub</TableHead>
                    <TableHead>Delivery Boy</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Packaging</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.rows || []).map((r: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-gray-900">{r.customerName}</TableCell>
                      <TableCell className="text-gray-600 max-w-[200px] truncate" title={r.address}>{r.address}</TableCell>
                      <TableCell className="text-gray-700">{r.mobile}</TableCell>
                      <TableCell className="text-gray-700">{r.hub}</TableCell>
                      <TableCell className="text-gray-700">{r.deliveryBoy}</TableCell>
                      <TableCell className="text-gray-700">{r.mode || '—'}</TableCell>
                      <TableCell className="text-gray-700">{r.product}</TableCell>
                      <TableCell className="text-gray-700">{r.packaging}</TableCell>
                      <TableCell className="text-right font-medium text-gray-900">{r.qty}</TableCell>
                      <TableCell className="text-gray-700 capitalize">{r.frequency}</TableCell>
                    </TableRow>
                  ))}
                  {(data?.rows || []).length === 0 && !isLoading && (
                    <TableRow><TableCell colSpan={10} className="text-center py-6 text-gray-500">No results found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{groupBy === 'hub' ? 'Hub' : 'Delivery Boy'}</TableHead>
                    {(data?.columns || []).map((c: string) => <TableHead key={c} className="text-right whitespace-nowrap">{c}(Packets)</TableHead>)}
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.rows || []).map((r: any) => (
                    <TableRow key={r.group}>
                      <TableCell className="font-medium text-gray-900">{r.group}</TableCell>
                      {(data?.columns || []).map((c: string) => <TableCell key={c} className="text-right">{r.values[c] || 0}</TableCell>)}
                      <TableCell className="text-right font-semibold">{r.total}</TableCell>
                    </TableRow>
                  ))}
                  {(data?.rows || []).length === 0 && !isLoading && (
                    <TableRow><TableCell colSpan={(data?.columns?.length || 0) + 2} className="text-center py-6 text-gray-500">No results found.</TableCell></TableRow>
                  )}
                </TableBody>
                {(data?.rows || []).length > 0 && (
                  <tfoot>
                    <tr className="border-t border-gray-200 font-semibold">
                      <td className="py-2 px-4">Total</td>
                      {(data?.columns || []).map((c: string) => <td key={c} className="py-2 px-4 text-right">{data?.grandTotal?.[c] || 0}</td>)}
                      <td className="py-2 px-4 text-right">{(data?.columns || []).reduce((s: number, c: string) => s + (data?.grandTotal?.[c] || 0), 0)}</td>
                    </tr>
                  </tfoot>
                )}
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
