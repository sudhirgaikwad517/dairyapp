import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { MapPinned, Search, RotateCcw, Download, ChevronLeft, ChevronRight } from 'lucide-react';
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

const emptyFilters = { state: '', city: '', areaName: '', hubId: '', service: '' };

export default function DeliveryAreaReport() {
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState(false);

  const { data: hubs = [] } = useQuery({ queryKey: ['hubsLite'], queryFn: async () => (await api.get('/admin/hubs')).data.data });

  const queryKey = ['deliveryAreaReport', applied, page, pageSize];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v; });
      return (await api.get('/admin/reports/delivery-area', { params })).data.data;
    }
  });

  const rows = data?.rows || [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const stats = useMemo(() => {
    const noRoute = rows.filter((r: any) => !r.route).length;
    const notServiceable = rows.filter((r: any) => !r.isServiceable).length;
    return { noRoute, notServiceable };
  }, [rows]);

  const handleSearch = () => { setApplied(draft); setPage(1); };
  const handleReset = () => { setDraft(emptyFilters); setApplied(emptyFilters); setPage(1); };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = {};
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/admin/reports/delivery-area/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `delivery-area-report-${Date.now()}.csv`);
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
            <MapPinned className="text-blue-600" /> Delivery Area Report
          </h2>
          <p className="text-gray-500 mt-1">Which delivery areas have a route and delivery boy assigned, and which don't.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-2">
          <Download size={16} /> {exporting ? 'Exporting...' : 'Export to Excel'}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-red-600">{stats.noRoute}</p><p className="text-xs text-gray-500 mt-0.5">Areas with No Route (this page)</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-amber-600">{stats.notServiceable}</p><p className="text-xs text-gray-500 mt-0.5">Not Serviceable (this page)</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-gray-100 pt-4">
          <Field label="State">
            <Input value={draft.state} onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))} />
          </Field>
          <Field label="City">
            <Input value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} />
          </Field>
          <Field label="Area Name">
            <Input value={draft.areaName} onChange={(e) => setDraft((d) => ({ ...d, areaName: e.target.value }))} />
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

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <CardTitle>Delivery Areas</CardTitle>
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
                <TableHead>State</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Area Name</TableHead>
                <TableHead>Area Pin</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Hub</TableHead>
                <TableHead>Delivery Boy</TableHead>
                <TableHead>Service Availability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell className="text-gray-700">{r.state || '—'}</TableCell>
                  <TableCell className="text-gray-700">{r.city || '—'}</TableCell>
                  <TableCell className="font-medium text-gray-900">{r.areaName}</TableCell>
                  <TableCell className="text-gray-700">{r.areaPin || '—'}</TableCell>
                  <TableCell className="text-gray-700">{r.route || <Badge variant="destructive">Not Assigned</Badge>}</TableCell>
                  <TableCell className="text-gray-700">{r.hub || <Badge variant="outline">No Hub</Badge>}</TableCell>
                  <TableCell className="text-gray-700">{r.deliveryBoy || <Badge variant="destructive">Not Assigned</Badge>}</TableCell>
                  <TableCell>{r.isServiceable ? <Badge variant="success">Delivery Available</Badge> : <Badge variant="destructive">Not Available</Badge>}</TableCell>
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
