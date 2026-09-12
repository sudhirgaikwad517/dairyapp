import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { PackageCheck, Plus, Search, RotateCcw, Edit } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function DeliveryModes() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState('');
  const [applied, setApplied] = useState('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['deliveryModes', applied],
    queryFn: async () => (await api.get('/admin/delivery-modes', { params: applied ? { name: applied } : {} })).data.data
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <PackageCheck className="text-blue-600" /> Delivery Mode
          </h2>
          <p className="text-gray-500 mt-1">How a delivery is handed over — used on the customer&apos;s profile.</p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/delivery-modes/new')}>
          <Plus size={16} /> Add New Delivery Mode
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <CardTitle>Manage Delivery Mode</CardTitle>
              <CardDescription>{isLoading ? 'Loading...' : `Displaying ${rows.length} results`}</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Input placeholder="Search by name..." value={draft} onChange={(e) => setDraft(e.target.value)} />
              <Button variant="outline" size="icon" onClick={() => setApplied(draft)} title="Search"><Search size={16} /></Button>
              <Button variant="outline" size="icon" onClick={() => { setDraft(''); setApplied(''); }} title="Reset"><RotateCcw size={16} /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Icon</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                      {m.iconUrl ? <img src={m.iconUrl} alt={m.name} className="w-full h-full object-cover" /> : null}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-gray-900">{m.name}</TableCell>
                  <TableCell>{m.isActive ? <Badge variant="success">Activated</Badge> : <Badge variant="outline">Deactivated</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={() => navigate(`/delivery-modes/${m.id}`)}>
                      <Edit size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={4} className="text-center py-6 text-gray-500">No delivery modes found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
