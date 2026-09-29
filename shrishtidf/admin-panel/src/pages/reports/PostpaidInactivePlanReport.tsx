import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { UserX, Search, RotateCcw, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: React.ReactNode; tone: 'outline' | 'destructive' }) {
  return (
    <Card>
      <CardContent className={`pt-6 rounded-lg ${tone === 'destructive' ? 'bg-red-50/40' : ''}`}>
        <p className={`text-2xl font-bold ${tone === 'destructive' ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
        <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function PostpaidInactivePlanReport() {
  const [hubId, setHubId] = useState('');
  const [applied, setApplied] = useState({ hubId: '' });
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const { data: hubs = [] } = useQuery({ queryKey: ['hubsLite'], queryFn: async () => (await api.get('/admin/hubs')).data.data });

  const queryKey = ['postpaidInactive', applied, page];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), pageSize: '20' };
      if (applied.hubId) params.hubId = applied.hubId;
      return (await api.get('/admin/reports/postpaid-inactive', { params })).data.data;
    }
  });

  const rows = data?.rows || [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const stats = useMemo(() => ({
    inactive: rows.filter((r: any) => r.status === 'inactive').length,
    cancelled: rows.filter((r: any) => r.status === 'cancelled').length
  }), [rows]);

  const handleSearch = () => { setApplied({ hubId }); setPage(1); };
  const handleReset = () => { setHubId(''); setApplied({ hubId: '' }); setPage(1); };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = {};
      if (applied.hubId) params.hubId = applied.hubId;
      const res = await api.get('/admin/reports/postpaid-inactive/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `postpaid-inactive-plans-${Date.now()}.csv`);
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
            <UserX className="text-blue-600" /> Postpaid Inactive Plan Report
          </h2>
          <p className="text-gray-500 mt-1">Postpaid customers whose plans have gone inactive or cancelled — useful for win-back follow-up.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-2">
          <Download size={16} /> {exporting ? 'Exporting...' : 'Export to Excel'}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Inactive" value={stats.inactive} tone="outline" />
        <StatCard label="Cancelled" value={stats.cancelled} tone="destructive" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
          <Field label="Hub">
            <Select value={hubId} onChange={(e) => setHubId(e.target.value)}>
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

      <Card>
        <CardHeader>
          <CardTitle>Plans</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : `Displaying ${rows.length} of ${total} results`}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Hub</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Inactivated On</TableHead>
                <TableHead>Cancelled On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium text-gray-900">{r.customerName}</TableCell>
                  <TableCell className="text-gray-700">{r.mobile}</TableCell>
                  <TableCell className="text-gray-700">{r.hub || '—'}</TableCell>
                  <TableCell className="text-gray-700">{r.plan}</TableCell>
                  <TableCell>{r.status === 'inactive' ? <Badge variant="outline">Inactive</Badge> : <Badge variant="destructive">Cancelled</Badge>}</TableCell>
                  <TableCell className="text-gray-600">{r.inactivatedAt ? new Date(r.inactivatedAt).toLocaleDateString('en-IN') : '—'}</TableCell>
                  <TableCell className="text-gray-600">{r.cancelledAt ? new Date(r.cancelledAt).toLocaleDateString('en-IN') : '—'}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-gray-500">No results found.</TableCell></TableRow>
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
