import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ArrowLeft, Bell, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export default function NotificationDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['notificationDetail', id, page],
    queryFn: async () => (await api.get(`/admin/notifications/${id}`, { params: { page: String(page), pageSize: '20' } })).data.data
  });

  if (isLoading || !data) return <div className="text-gray-500 p-8">Loading...</div>;

  const recipients = data.recipients?.rows || [];
  const totalPages = data.recipients?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/notifications')}><ArrowLeft size={16} /></Button>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Bell className="text-blue-600" /> Notification Detail
        </h2>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">{data.title}</CardTitle></CardHeader>
        <CardContent className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-gray-800 whitespace-pre-wrap">{data.message}</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline">{data.audienceSummary}</Badge>
            <span className="inline-flex items-center gap-1 text-gray-600"><Users size={14} /> {data.recipientCount} recipients</span>
            <span className="text-gray-500">Sent by {data.sentBy || 'Admin'} at {data.createdAt ? new Date(data.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recipients</CardTitle>
          <CardDescription>{data.readCount ?? 0} of {data.recipientCount} have read this notification</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Read Status</TableHead>
                <TableHead>Read At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipients.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-gray-900">{r.customerCode} - {r.customerName}</TableCell>
                  <TableCell>{r.isRead ? <Badge variant="success">Read</Badge> : <Badge variant="outline">Unread</Badge>}</TableCell>
                  <TableCell className="text-gray-600">{r.readAt ? new Date(r.readAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
                </TableRow>
              ))}
              {recipients.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center py-6 text-gray-500">No recipients found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
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
