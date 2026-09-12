import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Users, Search, RotateCcw, UserPlus, Download, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

const emptyFilters = {
  name: '', mobile: '', email: '', city: '', customerType: '', routeId: '', hubId: '',
  deliveryBoyId: '', deliveryBoyNotAssigned: false, status: '', subscriptionStatus: '',
  regFrom: '', regTo: ''
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function Customers() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState(false);

  const { data: routes = [] } = useQuery({
    queryKey: ['routesLite'],
    queryFn: async () => (await api.get('/admin/routes')).data.data
  });
  const { data: hubs = [] } = useQuery({
    queryKey: ['hubsLite'],
    queryFn: async () => (await api.get('/admin/hubs')).data.data
  });
  const { data: deliveryBoys = [] } = useQuery({
    queryKey: ['deliveryBoysLite'],
    queryFn: async () => (await api.get('/admin/delivery-boys')).data.data
  });

  const { data, isLoading } = useQuery({
    queryKey: ['customers', applied, page, pageSize],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
      Object.entries(applied).forEach(([k, v]) => {
        if (v === '' || v === false) return;
        params[k] = String(v);
      });
      const res = await api.get('/admin/customers', { params });
      return res.data.data;
    }
  });

  const rows = data?.rows || [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleSearch = () => {
    setApplied(draft);
    setPage(1);
  };

  const handleReset = () => {
    setDraft(emptyFilters);
    setApplied(emptyFilters);
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = {};
      Object.entries(applied).forEach(([k, v]) => {
        if (v === '' || v === false) return;
        params[k] = String(v);
      });
      const res = await api.get('/admin/customers/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `customers-${Date.now()}.csv`);
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
            <Users className="text-blue-600" /> Customers
          </h2>
          <p className="text-gray-500 mt-1">Manage registered customers, delivery assignment, and status.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-2">
            <Download size={16} /> {exporting ? 'Exporting...' : 'Export to Excel'}
          </Button>
          <Button className="gap-2" onClick={() => navigate('/customers/new')}>
            <UserPlus size={16} /> Add New Customer
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 border-t border-gray-100 pt-4">
          <Field label="Customer Name">
            <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Search by name" />
          </Field>
          <Field label="Mobile">
            <Input value={draft.mobile} onChange={(e) => setDraft((d) => ({ ...d, mobile: e.target.value }))} placeholder="Search by mobile" />
          </Field>
          <Field label="Email">
            <Input value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} placeholder="Search by email" />
          </Field>
          <Field label="City">
            <Input value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} placeholder="Search by city" />
          </Field>
          <Field label="Customer Type">
            <Select value={draft.customerType} onChange={(e) => setDraft((d) => ({ ...d, customerType: e.target.value }))}>
              <option value="">All Types</option>
              <option value="prepaid">Prepaid</option>
              <option value="postpaid">Postpaid</option>
            </Select>
          </Field>
          <Field label="Route">
            <Select value={draft.routeId} onChange={(e) => setDraft((d) => ({ ...d, routeId: e.target.value }))}>
              <option value="">All Routes</option>
              {routes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          </Field>
          <Field label="Hub">
            <Select value={draft.hubId} onChange={(e) => setDraft((d) => ({ ...d, hubId: e.target.value }))}>
              <option value="">All Hubs</option>
              {hubs.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </Select>
          </Field>
          <Field label="Delivery Boy">
            <Select
              value={draft.deliveryBoyId}
              onChange={(e) => setDraft((d) => ({ ...d, deliveryBoyId: e.target.value, deliveryBoyNotAssigned: false }))}
              disabled={draft.deliveryBoyNotAssigned}
            >
              <option value="">All Delivery Boys</option>
              {deliveryBoys.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
            <label className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={draft.deliveryBoyNotAssigned}
                onChange={(e) => setDraft((d) => ({ ...d, deliveryBoyNotAssigned: e.target.checked, deliveryBoyId: '' }))}
              />
              Not Assigned only
            </label>
          </Field>
          <Field label="Status">
            <Select value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
          <Field label="Subscription Status">
            <Select value={draft.subscriptionStatus} onChange={(e) => setDraft((d) => ({ ...d, subscriptionStatus: e.target.value }))}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
              <option value="none">No Subscription</option>
            </Select>
          </Field>
          <Field label="Registered From">
            <Input type="date" value={draft.regFrom} onChange={(e) => setDraft((d) => ({ ...d, regFrom: e.target.value }))} />
          </Field>
          <Field label="Registered To">
            <Input type="date" value={draft.regTo} onChange={(e) => setDraft((d) => ({ ...d, regTo: e.target.value }))} />
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
              <CardTitle>Customer Directory</CardTitle>
              <CardDescription>{isLoading ? 'Loading...' : `Displaying ${rows.length} of ${total} results`}</CardDescription>
            </div>
            <Field label="Page size">
              <Select value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="w-auto">
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </Select>
            </Field>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Hub</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Delivery Boy</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-blue-600 font-medium">{c.code || '—'}</TableCell>
                  <TableCell>
                    <span className="font-medium text-gray-900 block">{c.name || 'Unnamed'}</span>
                    <div className="flex gap-1 mt-1">
                      <Badge variant={c.serviceable ? 'success' : 'destructive'} className="text-[10px]">
                        {c.serviceable ? 'In Service Area' : 'Not Serviceable'}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">{c.customerType}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-800 font-medium">{c.phone}</TableCell>
                  <TableCell className="text-gray-600">{c.registeredAt ? new Date(c.registeredAt).toLocaleDateString('en-IN') : '—'}</TableCell>
                  <TableCell className="text-gray-800">{c.city || '—'}</TableCell>
                  <TableCell className="text-gray-700">{c.hub || <span className="text-red-600 text-xs">No Hub</span>}</TableCell>
                  <TableCell className="text-gray-700">{c.route || <span className="text-red-600 text-xs">No Route</span>}</TableCell>
                  <TableCell className="text-gray-700">{c.deliveryBoy || <span className="text-red-600 text-xs">Not Assigned</span>}</TableCell>
                  <TableCell>
                    {c.subscriptionStatus === 'active' && <Badge variant="success">Active</Badge>}
                    {c.subscriptionStatus === 'paused' && <Badge variant="warning">Paused</Badge>}
                    {c.subscriptionStatus === 'cancelled' && <Badge variant="outline">Cancelled</Badge>}
                    {c.subscriptionStatus === 'none' && <Badge variant="outline">None</Badge>}
                  </TableCell>
                  <TableCell>
                    {c.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={() => navigate(`/customers/${c.id}`)}>
                      <Edit size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-6 text-gray-500">
                    No customers found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="gap-1">
                <ChevronLeft size={16} /> Prev
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="gap-1">
                Next <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
