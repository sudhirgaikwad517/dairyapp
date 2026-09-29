import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { MessageSquare, Plus, Search, RotateCcw, Download, Eye, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import CustomerPicker from '../../components/CustomerPicker';
import { useAuth } from '../../context/AuthContext';

const emptyFilters = { dateFrom: '', dateTo: '', feedbackCategoryId: '', status: '', feedbackMode: '', city: '', type: '' };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  new: 'default', in_progress: 'warning', resolved: 'success', closed: 'outline'
};
const STATUS_LABEL: Record<string, string> = { new: 'New', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' };
const MODE_LABEL: Record<string, string> = { app: 'App', website: 'Website', call: 'Call', whatsapp: 'WhatsApp', email: 'Email' };

export default function FeedbackList() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const canCreate = can('feedback', 'canCreate');
  const canExcel = can('feedback', 'canExcel');
  const [customer, setCustomer] = useState<any>(null);
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState<typeof emptyFilters & { customerId?: string }>(emptyFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['feedbackCategoriesActive'],
    queryFn: async () => (await api.get('/admin/feedback-categories', { params: { activeOnly: 'true' } })).data.data
  });

  const queryKey = ['feedbackList', applied, page, pageSize];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v; });
      return (await api.get('/admin/feedback', { params })).data.data;
    }
  });

  const rows = data?.rows || [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleSearch = () => { setApplied({ ...draft, customerId: customer?.id }); setPage(1); };
  const handleReset = () => { setDraft(emptyFilters); setCustomer(null); setApplied(emptyFilters); setPage(1); };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = {};
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/admin/feedback/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `feedback-report-${Date.now()}.csv`);
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
            <MessageSquare className="text-blue-600" /> Feedback
          </h2>
          <p className="text-gray-500 mt-1">Feedback and complaints from customers, submitted via the app or logged by admin.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canExcel && (
            <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-2">
              <Download size={16} /> {exporting ? 'Exporting...' : 'Export to Excel'}
            </Button>
          )}
          {canCreate && <Button onClick={() => navigate('/feedback/new')} className="gap-2"><Plus size={16} /> Add New Feedback</Button>}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent className="space-y-4 border-t border-gray-100 pt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Date From">
              <Input type="date" value={draft.dateFrom} onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))} />
            </Field>
            <Field label="Date To">
              <Input type="date" value={draft.dateTo} min={draft.dateFrom} onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))} />
            </Field>
            <Field label="Type">
              <Select value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}>
                <option value="">Feedback &amp; Complaints</option>
                <option value="feedback">Feedback</option>
                <option value="complaint">Complaint</option>
              </Select>
            </Field>
            <Field label="Feedback Category">
              <Select value={draft.feedbackCategoryId} onChange={(e) => setDraft((d) => ({ ...d, feedbackCategoryId: e.target.value }))}>
                <option value="">All Categories</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Feedback Status">
              <Select value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
                <option value="">All Status</option>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Feedback Mode">
              <Select value={draft.feedbackMode} onChange={(e) => setDraft((d) => ({ ...d, feedbackMode: e.target.value }))}>
                <option value="">All Modes</option>
                {Object.entries(MODE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="City">
              <Input value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} />
            </Field>
          </div>
          <Field label="Customer">
            {customer ? (
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium text-gray-900">{customer.code} - {customer.name}</p>
                <Button variant="outline" size="sm" onClick={() => setCustomer(null)}>Clear</Button>
              </div>
            ) : (
              <CustomerPicker onSelect={(c) => setCustomer(c)} />
            )}
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
              <CardTitle>Manage Feedback</CardTitle>
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
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Feedback</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reply</TableHead>
                <TableHead>Entry By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((f: any) => (
                <TableRow key={f.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/feedback/${f.id}`)}>
                  <TableCell>
                    <span className="font-medium text-gray-900 block">{f.customerCode} - {f.customerName}</span>
                    <span className="text-xs text-gray-500">{f.customerCity || '—'}</span>
                  </TableCell>
                  <TableCell className="text-gray-600 whitespace-nowrap">{new Date(f.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                  <TableCell>
                    <Badge variant={f.type === 'complaint' ? 'destructive' : 'outline'}>{f.type === 'complaint' ? 'Complaint' : 'Feedback'}</Badge>
                  </TableCell>
                  <TableCell className="text-gray-700 capitalize">{MODE_LABEL[f.feedbackMode] || f.feedbackMode}</TableCell>
                  <TableCell className="text-gray-700">{f.categoryName || <span className="text-gray-400">—</span>}</TableCell>
                  <TableCell className="max-w-xs">
                    {f.rating != null && (
                      <span className="inline-flex items-center gap-1 text-amber-500 text-xs font-medium mb-1">
                        <Star size={12} className="fill-current" /> {f.rating}/5
                      </span>
                    )}
                    {f.subject && <p className="text-gray-900 font-medium text-xs truncate" title={f.subject}>{f.subject}</p>}
                    <p className="text-gray-700 truncate" title={f.comment}>{f.comment || '—'}</p>
                  </TableCell>
                  <TableCell><Badge variant={STATUS_BADGE[f.status] || 'default'}>{STATUS_LABEL[f.status] || f.status}</Badge></TableCell>
                  <TableCell className="text-gray-600 max-w-[160px] truncate" title={f.reply || ''}>{f.reply || <span className="text-gray-400 italic">Empty</span>}</TableCell>
                  <TableCell className="text-gray-600 capitalize">{f.entryBy}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={(e) => { e.stopPropagation(); navigate(`/feedback/${f.id}`); }}>
                      <Eye size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={10} className="text-center py-6 text-gray-500">No feedback found.</TableCell></TableRow>
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
