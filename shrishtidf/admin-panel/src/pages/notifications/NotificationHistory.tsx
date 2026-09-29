import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Bell, Plus, Download, Eye, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function NotificationHistory() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const canCreate = can('notifications', 'canCreate');
  const canExcel = can('notifications', 'canExcel');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['notificationHistory', page, pageSize],
    queryFn: async () => (await api.get('/admin/notifications', { params: { page: String(page), pageSize: String(pageSize) } })).data.data
  });

  const rows = data?.rows || [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/admin/notifications/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `notifications-${Date.now()}.csv`);
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
            <Bell className="text-blue-600" /> Notifications
          </h2>
          <p className="text-gray-500 mt-1">Send a notification to all customers, or filter to a specific audience — active, inactive, city, subscription status and more.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canExcel && (
            <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-2">
              <Download size={16} /> {exporting ? 'Exporting...' : 'Export to Excel'}
            </Button>
          )}
          {canCreate && <Button onClick={() => navigate('/notifications/new')} className="gap-2"><Plus size={16} /> Send New Notification</Button>}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <CardTitle>Sent Notifications</CardTitle>
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
                <TableHead>Title</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead className="text-right">Recipients</TableHead>
                <TableHead className="text-right">Read</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((n: any) => (
                <TableRow key={n.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/notifications/${n.id}`)}>
                  <TableCell className="font-medium text-gray-900">{n.title}</TableCell>
                  <TableCell className="text-gray-600 max-w-xs truncate" title={n.message}>{n.message}</TableCell>
                  <TableCell><Badge variant="outline">{n.audienceSummary}</Badge></TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-1 text-gray-800 font-medium"><Users size={14} className="text-gray-400" /> {n.recipientCount}</span>
                  </TableCell>
                  <TableCell className="text-right text-gray-600">{n.readCount ?? 0}/{n.recipientCount}</TableCell>
                  <TableCell className="text-gray-600 whitespace-nowrap">{n.createdAt ? new Date(n.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={(e) => { e.stopPropagation(); navigate(`/notifications/${n.id}`); }}>
                      <Eye size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-gray-500">No notifications sent yet.</TableCell></TableRow>
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
