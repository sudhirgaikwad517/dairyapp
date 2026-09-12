import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Building2, Plus, Search, RotateCcw, Edit } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

const emptyFilters = { name: '', city: '', status: 'all' };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function Hubs() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['hubs', applied],
    queryFn: async () => {
      const params: Record<string, string> = {};
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v; });
      return (await api.get('/admin/hubs', { params })).data.data;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Building2 className="text-blue-600" /> Hub
          </h2>
          <p className="text-gray-500 mt-1">Distribution hubs that routes and delivery boys are organized under.</p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/logistics/hubs/new')}>
          <Plus size={16} /> Add New Hub
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3 border-t border-gray-100 pt-4">
          <Field label="Hub">
            <Input placeholder="Search by hub name..." value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </Field>
          <Field label="City">
            <Input placeholder="Search by city..." value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} />
          </Field>
          <Field label="Status">
            <Select value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
              <option value="all">All Status</option>
              <option value="active">Activated</option>
              <option value="inactive">Deactivated</option>
            </Select>
          </Field>
        </CardContent>
        <CardContent className="flex flex-wrap gap-3 pt-0">
          <Button onClick={() => setApplied(draft)} className="gap-2"><Search size={16} /> Search</Button>
          <Button variant="outline" onClick={() => { setDraft(emptyFilters); setApplied(emptyFilters); }} className="gap-2"><RotateCcw size={16} /> Reset</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Hub</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : `Displaying ${rows.length} results`}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hub</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((h: any) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium text-gray-900">{h.name}</TableCell>
                  <TableCell className="text-gray-700">{h.city || '—'}</TableCell>
                  <TableCell>{h.isActive ? <Badge variant="success">Activated</Badge> : <Badge variant="outline">Deactivated</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={() => navigate(`/logistics/hubs/${h.id}`)}>
                      <Edit size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-gray-500">No hubs found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
