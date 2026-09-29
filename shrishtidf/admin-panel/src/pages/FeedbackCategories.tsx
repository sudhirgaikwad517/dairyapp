import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ListChecks, Plus, Search, RotateCcw, Download, Edit } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
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

export default function FeedbackCategories() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const canCreate = can('feedback_master', 'canCreate');
  const canExcel = can('feedback_master', 'canExcel');
  const canUpdate = can('feedback_master', 'canUpdate');
  const [draft, setDraft] = useState({ name: '', status: '' });
  const [applied, setApplied] = useState({ name: '', status: '' });
  const [exporting, setExporting] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['feedbackCategories', applied],
    queryFn: async () => {
      const params: Record<string, string> = {};
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v; });
      return (await api.get('/admin/feedback-categories', { params })).data.data;
    }
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = {};
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/admin/feedback-categories/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `feedback-master-${Date.now()}.csv`);
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
            <ListChecks className="text-blue-600" /> Feedback Master
          </h2>
          <p className="text-gray-500 mt-1">Feedback options/categories customers and admins can tag a feedback with.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canExcel && (
            <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-2">
              <Download size={16} /> {exporting ? 'Exporting...' : 'Export to Excel'}
            </Button>
          )}
          {canCreate && (
            <Button className="gap-2" onClick={() => navigate('/feedback/master/new')}>
              <Plus size={16} /> Add New Feedback Option
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
          <Field label="Option Name">
            <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Search by name" />
          </Field>
          <Field label="Status">
            <Select value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
              <option value="">All Status</option>
              <option value="active">Activated</option>
              <option value="inactive">Deactivated</option>
            </Select>
          </Field>
        </CardContent>
        <CardContent className="flex flex-wrap gap-3 pt-0">
          <Button onClick={() => setApplied(draft)} className="gap-2"><Search size={16} /> Search</Button>
          <Button variant="outline" onClick={() => { setDraft({ name: '', status: '' }); setApplied({ name: '', status: '' }); }} className="gap-2"><RotateCcw size={16} /> Reset</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Feedback Master</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : `Displaying ${rows.length} results`}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Option</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Used In</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-gray-900">{r.name}</TableCell>
                  <TableCell>{r.isActive ? <Badge variant="success">Activated</Badge> : <Badge variant="outline">Deactivated</Badge>}</TableCell>
                  <TableCell className="text-gray-600">{r.usageCount} feedback{r.usageCount === 1 ? '' : 's'}</TableCell>
                  <TableCell className="text-right">
                    {canUpdate && (
                      <Button variant="ghost" size="icon" className="text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={() => navigate(`/feedback/master/${r.id}`)}>
                        <Edit size={16} />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={4} className="text-center py-6 text-gray-500">No feedback options found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
