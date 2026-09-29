import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Search, RotateCcw, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import CustomerPicker from './CustomerPicker';

export default function ChangeRequestReportView({ title, description, quickRange, exportFilename }: {
  title: string;
  description: string;
  quickRange?: 'todayTomorrow';
  exportFilename: string;
}) {
  const [customer, setCustomer] = useState<any>(null);
  const [applied, setApplied] = useState<{ customerId?: string }>({});
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const queryKey = ['changeRequests', quickRange, applied, page];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), pageSize: '20' };
      if (quickRange) params.quickRange = quickRange;
      if (applied.customerId) params.customerId = applied.customerId;
      return (await api.get('/admin/reports/change-requests', { params })).data.data;
    }
  });

  const rows = data?.rows || [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleSearch = () => { setApplied({ customerId: customer?.id }); setPage(1); };
  const handleReset = () => { setCustomer(null); setApplied({}); setPage(1); };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = {};
      if (quickRange) params.quickRange = quickRange;
      if (applied.customerId) params.customerId = applied.customerId;
      const res = await api.get('/admin/reports/change-requests/export', { params, responseType: 'blob' });
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

      {!quickRange && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
          <CardContent className="border-t border-gray-100 pt-4">
            {customer ? (
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium text-gray-900">{customer.code} - {customer.name}</p>
                <Button variant="outline" size="sm" onClick={() => setCustomer(null)}>Clear</Button>
              </div>
            ) : (
              <CustomerPicker onSelect={(c) => setCustomer(c)} />
            )}
          </CardContent>
          <CardContent className="flex flex-wrap gap-3 pt-0">
            <Button onClick={handleSearch} className="gap-2"><Search size={16} /> Search</Button>
            <Button variant="outline" onClick={handleReset} className="gap-2"><RotateCcw size={16} /> Reset</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Change Requests</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : `Displaying ${rows.length} of ${total} results`}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Requested On</TableHead>
                <TableHead>Effective From</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium text-gray-900">{r.customerName}</TableCell>
                  <TableCell className="text-gray-700">{r.mobile}</TableCell>
                  <TableCell className="text-gray-700">{r.plan}</TableCell>
                  <TableCell className="text-gray-600">{r.requestedOn ? new Date(r.requestedOn).toLocaleDateString('en-IN') : '—'}</TableCell>
                  <TableCell className="text-gray-600">{r.effectiveFrom ? new Date(r.effectiveFrom).toLocaleDateString('en-IN') : '—'}</TableCell>
                  <TableCell>{r.requestedBy === 'Admin' ? <Badge variant="default">Admin</Badge> : <Badge variant="outline">Customer</Badge>}</TableCell>
                  <TableCell className="text-gray-600 max-w-xs truncate" title={r.details}>{r.details}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-gray-500">No change requests found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>

          {!quickRange && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="gap-1"><ChevronLeft size={16} /> Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="gap-1">Next <ChevronRight size={16} /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
