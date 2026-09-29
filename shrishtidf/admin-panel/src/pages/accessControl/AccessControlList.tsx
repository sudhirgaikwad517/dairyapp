import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { ShieldCheck, Plus, Search, RotateCcw, Download, Eye, Pencil, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function AccessControlList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [officeStaffId, setOfficeStaffId] = useState('');
  const [applied, setApplied] = useState('');
  const [exporting, setExporting] = useState(false);

  const { data: staffOptions = [] } = useQuery({
    queryKey: ['accessControlEligibleStaffAll'],
    queryFn: async () => (await api.get('/admin/access-control/eligible-staff')).data.data
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['accessControlList', applied],
    queryFn: async () => (await api.get('/admin/access-control', { params: applied ? { officeStaffId: applied } : {} })).data.data
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/access-control/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accessControlList'] })
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/admin/access-control/export', { params: applied ? { officeStaffId: applied } : {}, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `user-access-control-${Date.now()}.csv`);
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
            <ShieldCheck className="text-blue-600" /> User Access Control
          </h2>
          <p className="text-gray-500 mt-1">Decide exactly which modules and actions each employee can access.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-2">
            <Download size={16} /> {exporting ? 'Exporting...' : 'Export to Excel'}
          </Button>
          <Button onClick={() => navigate('/user-access-control/new')} className="gap-2"><Plus size={16} /> Add New Access Control</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
          <Field label="User">
            <Select value={officeStaffId} onChange={(e) => setOfficeStaffId(e.target.value)}>
              <option value="">Select User</option>
              {staffOptions.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.staffTypeName})</option>)}
            </Select>
          </Field>
        </CardContent>
        <CardContent className="flex flex-wrap gap-3 pt-0">
          <Button onClick={() => setApplied(officeStaffId)} className="gap-2"><Search size={16} /> Search</Button>
          <Button variant="outline" onClick={() => { setOfficeStaffId(''); setApplied(''); }} className="gap-2"><RotateCcw size={16} /> Reset</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage User Access Control</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : `Displaying ${rows.length} of ${rows.length} results`}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sr. No.</TableHead>
                <TableHead>User Type</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Modules Granted</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-gray-600">{r.srNo}</TableCell>
                  <TableCell className="font-medium text-gray-900 uppercase">{r.userTypeName}</TableCell>
                  <TableCell className="text-gray-800">{r.userName}</TableCell>
                  <TableCell>
                    <Badge variant={r.modulesGranted > 0 ? 'success' : 'outline'}>{r.modulesGranted} / {r.totalModules} modules</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-100" title="View" onClick={() => navigate(`/user-access-control/${r.id}`)}>
                        <Eye size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-blue-600 hover:bg-blue-50 hover:text-blue-700" title="Edit" onClick={() => navigate(`/user-access-control/${r.id}/edit`)}>
                        <Pencil size={16} />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="text-red-600 hover:bg-red-50 hover:text-red-700" title="Remove"
                        onClick={() => { if (confirm(`Remove access control for ${r.userName}?`)) deleteMutation.mutate(r.id); }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-gray-500">No access controls configured yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
