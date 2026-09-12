import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Landmark, Plus, Search, RotateCcw, Download, Edit } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

const emptyFilters = { deliveryAreaId: '', name: '' };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function SubAreas() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [exporting, setExporting] = useState(false);

  const { data: areas = [] } = useQuery({
    queryKey: ['deliveryAreasLite'],
    queryFn: async () => (await api.get('/admin/logistics/delivery-areas')).data.data
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['subAreas', applied],
    queryFn: async () => {
      const params: Record<string, string> = {};
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v; });
      return (await api.get('/admin/logistics/sub-areas', { params })).data.data;
    }
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = {};
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/admin/logistics/sub-areas/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sub-areas-${Date.now()}.csv`);
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
            <Landmark className="text-blue-600" /> Sub Area
          </h2>
          <p className="text-gray-500 mt-1">Finer subdivisions within a Delivery Area.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-2">
            <Download size={16} /> {exporting ? 'Exporting...' : 'Export to Excel'}
          </Button>
          <Button className="gap-2" onClick={() => navigate('/logistics/sub-areas/new')}>
            <Plus size={16} /> Add New Sub Area
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
          <Field label="Delivery Area">
            <Select value={draft.deliveryAreaId} onChange={(e) => setDraft((d) => ({ ...d, deliveryAreaId: e.target.value }))}>
              <option value="">All Delivery Areas</option>
              {areas.map((a: any) => <option key={a.id} value={a.id}>{a.areaName}</option>)}
            </Select>
          </Field>
          <Field label="Sub Area">
            <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </Field>
        </CardContent>
        <CardContent className="flex flex-wrap gap-3 pt-0">
          <Button onClick={() => setApplied(draft)} className="gap-2"><Search size={16} /> Search</Button>
          <Button variant="outline" onClick={() => { setDraft(emptyFilters); setApplied(emptyFilters); }} className="gap-2"><RotateCcw size={16} /> Reset</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Sub Area</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : `Displaying ${rows.length} results`}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Delivery Area</TableHead>
                <TableHead>Sub Area</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="text-gray-700">{s.deliveryArea || '—'}</TableCell>
                  <TableCell className="font-medium text-gray-900">{s.name}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={() => navigate(`/logistics/sub-areas/${s.id}`)}>
                      <Edit size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={3} className="text-center py-6 text-gray-500">No results found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
