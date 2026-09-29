import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Plane, Plus, RotateCcw, Download, XCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import CustomerPicker from '../components/CustomerPicker';

export default function Vacations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [customer, setCustomer] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [endingId, setEndingId] = useState<string | null>(null);

  const queryKey = ['vacations', customer?.id, page];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), pageSize: '10' };
      if (customer) params.customerId = customer.id;
      return (await api.get('/admin/vacations', { params })).data.data;
    }
  });

  const rows = data?.rows || [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = {};
      if (customer) params.customerId = customer.id;
      const res = await api.get('/admin/vacations/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vacations-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleEndEarly = async (id: string) => {
    setEndingId(id);
    try {
      await api.post(`/admin/vacations/${id}/end`);
      await queryClient.invalidateQueries({ queryKey });
    } finally {
      setEndingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Plane className="text-blue-600" /> Vacation
          </h2>
          <p className="text-gray-500 mt-1">Suspend deliveries for a customer over a date range — no bottles are counted as owed for skipped days.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-2">
            <Download size={16} /> {exporting ? 'Exporting...' : 'Export to Excel'}
          </Button>
          <Button className="gap-2" onClick={() => navigate('/subscriptions/vacations/new')}>
            <Plus size={16} /> Add New Vacation
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filter by Customer</CardTitle></CardHeader>
        <CardContent className="border-t border-gray-100 pt-4">
          {customer ? (
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-gray-900">{customer.code} - {customer.name}</p>
              <Button variant="outline" size="sm" onClick={() => setCustomer(null)} className="gap-1"><RotateCcw size={14} /> Clear</Button>
            </div>
          ) : (
            <CustomerPicker onSelect={(c) => { setCustomer(c); setPage(1); }} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Vacation</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : `Displaying ${rows.length} of ${total} results`}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>From Date</TableHead>
                <TableHead>To Date</TableHead>
                <TableHead>Remark</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Entry By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium text-gray-900">{v.customerName}</TableCell>
                  <TableCell className="text-gray-700">{String(v.fromDate).slice(0, 10)}</TableCell>
                  <TableCell className="text-gray-700">{String(v.toDate).slice(0, 10)}</TableCell>
                  <TableCell className="text-gray-600">{v.remark || '—'}</TableCell>
                  <TableCell>
                    {v.isActive ? <Badge variant="warning">Ongoing</Badge> : <Badge variant="outline">Ended{v.endedBy ? ' Early' : ''}</Badge>}
                  </TableCell>
                  <TableCell className="text-gray-600">{v.entryBy || '—'}</TableCell>
                  <TableCell className="text-right">
                    {v.isActive && (
                      <Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-50 hover:text-red-700" title="End vacation now" disabled={endingId === v.id} onClick={() => handleEndEarly(v.id)}>
                        <XCircle size={16} />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-gray-500">No vacations found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
