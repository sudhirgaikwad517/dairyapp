import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Tractor, Search, RotateCcw, Download, Reply as ReplyIcon, ChevronLeft, ChevronRight, X, Send } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function FarmVisitRequests() {
  const { can } = useAuth();
  const canUpdate = can('farm_visit', 'canUpdate');
  const canExcel = can('farm_visit', 'canExcel');
  const queryClient = useQueryClient();

  const [visitDate, setVisitDate] = useState('');
  const [applied, setApplied] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState(false);
  const [replyTarget, setReplyTarget] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['farmVisits', applied, page, pageSize],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
      if (applied) params.visitDate = applied;
      return (await api.get('/admin/farm-visits', { params })).data.data;
    }
  });

  const replyMutation = useMutation({
    mutationFn: async () => api.patch(`/admin/farm-visits/${replyTarget.id}/reply`, { reply: replyText.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farmVisits'] });
      setReplyTarget(null);
      setReplyText('');
    },
    onError: (err: any) => setReplyError(err?.response?.data?.message || 'Unable to send reply.')
  });

  const rows = data?.rows || [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleSearch = () => { setApplied(visitDate); setPage(1); };
  const handleReset = () => { setVisitDate(''); setApplied(''); setPage(1); };

  const openReply = (r: any) => {
    setReplyTarget(r);
    setReplyText(r.reply || '');
    setReplyError('');
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = {};
      if (applied) params.visitDate = applied;
      const res = await api.get('/admin/farm-visits/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `farm-visit-requests-${Date.now()}.csv`);
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
            <Tractor className="text-blue-600" /> Farm Visit Requests
          </h2>
          <p className="text-gray-500 mt-1">Visit requests submitted by customers and website visitors who want to see the farm.</p>
        </div>
        {canExcel && (
          <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-2">
            <Download size={16} /> {exporting ? 'Exporting...' : 'Export to Excel'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-gray-100 pt-4">
          <Field label="Visit Date">
            <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
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
              <CardTitle>Requests</CardTitle>
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
                <TableHead>Name</TableHead>
                <TableHead>Contact No</TableHead>
                <TableHead className="text-right">No. of Persons</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Reply</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-gray-900">{r.name}</TableCell>
                  <TableCell className="text-gray-700">{r.contactNo}</TableCell>
                  <TableCell className="text-right text-gray-800">{r.numberOfPersons}</TableCell>
                  <TableCell className="text-gray-600 max-w-[220px] truncate" title={r.address}>{r.address}</TableCell>
                  <TableCell className="text-gray-600 whitespace-nowrap">{new Date(r.visitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                  <TableCell className="text-gray-600 whitespace-nowrap">{r.visitTimeSlot}</TableCell>
                  <TableCell>
                    {canUpdate ? (
                      <button
                        onClick={() => openReply(r)}
                        className="text-left text-blue-600 hover:underline text-sm max-w-[180px] truncate block"
                      >
                        {r.reply ? r.reply : <span className="italic text-gray-400">Empty</span>}
                      </button>
                    ) : (
                      r.reply ? <span className="text-sm text-gray-700">{r.reply}</span> : <span className="italic text-gray-400 text-sm">Empty</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-gray-500">No farm visit requests found.</TableCell></TableRow>
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

      {replyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setReplyTarget(null)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg flex items-center gap-2"><ReplyIcon size={18} className="text-gray-400" /> Reply to {replyTarget.name}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setReplyTarget(null)}><X size={16} /></Button>
            </CardHeader>
            <CardContent className="border-t border-gray-100 pt-4 space-y-3">
              {replyError && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">{replyError}</div>}
              <p className="text-xs text-gray-500">
                Visit requested for {new Date(replyTarget.visitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, {replyTarget.visitTimeSlot} · {replyTarget.numberOfPersons} person(s)
              </p>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Confirm the visit, suggest a different time, etc."
              />
              <Button
                className="gap-2"
                disabled={replyMutation.isPending || !replyText.trim()}
                onClick={() => { setReplyError(''); replyMutation.mutate(); }}
              >
                <Send size={16} /> {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
