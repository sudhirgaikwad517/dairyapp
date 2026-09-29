import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Ticket, Plus, Search, RotateCcw, Edit } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function Coupons() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState({ code: '', status: '' });
  const [applied, setApplied] = useState({ code: '', status: '' });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['coupons', applied, page],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page) };
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v; });
      return (await api.get('/admin/coupons', { params })).data.data;
    }
  });

  const rows = data?.rows || [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Ticket className="text-blue-600" /> Coupons
          </h2>
          <p className="text-gray-500 mt-1">Discount coupons shown to customers on the app's Coupons screen.</p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/coupons/new')}><Plus size={16} /> Add New Coupon</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
          <Field label="Code">
            <Input value={draft.code} onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))} placeholder="Search by code" />
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
          <Button onClick={() => { setApplied(draft); setPage(1); }} className="gap-2"><Search size={16} /> Search</Button>
          <Button variant="outline" onClick={() => { setDraft({ code: '', status: '' }); setApplied({ code: '', status: '' }); setPage(1); }} className="gap-2"><RotateCcw size={16} /> Reset</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Coupons</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : `Displaying ${rows.length} of ${total} results`}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Min Order</TableHead>
                <TableHead>Valid Till</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c: any) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/coupons/${c.id}`)}>
                  <TableCell className="font-mono font-medium text-gray-900">{c.code}</TableCell>
                  <TableCell className="text-gray-700">{c.title}</TableCell>
                  <TableCell className="text-gray-700">{c.discountType === 'percent' ? `${c.discountValue}%` : `₹${c.discountValue}`}</TableCell>
                  <TableCell className="text-gray-700">₹{c.minOrderAmount}</TableCell>
                  <TableCell className="text-gray-600">{c.validTo ? new Date(c.validTo).toLocaleDateString('en-IN') : 'No expiry'}</TableCell>
                  <TableCell>{c.isActive ? <Badge variant="success">Activated</Badge> : <Badge variant="outline">Deactivated</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={(e) => { e.stopPropagation(); navigate(`/coupons/${c.id}`); }}>
                      <Edit size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-gray-500">No coupons found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
