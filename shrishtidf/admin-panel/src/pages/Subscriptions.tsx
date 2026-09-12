import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Calendar, Search, Play, Pause, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function Subscriptions() {
  const [search, setSearch] = useState('');

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const res = await api.get('/admin/subscriptions');
      return res.data.data;
    }
  });

  const filtered = subscriptions.filter((s: any) => 
    (s.customerName || '').toLowerCase().includes(search.toLowerCase()) || 
    (s.id || '').toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active': return <Badge variant="success">Active</Badge>;
      case 'Paused': return <Badge variant="warning">Paused</Badge>;
      case 'Cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Calendar className="text-orange-600" /> Subscriptions
          </h2>
          <p className="text-gray-500 mt-1">Manage recurring deliveries for customers.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <CardTitle>Subscription List</CardTitle>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <Input 
                placeholder="Search by ID or Customer..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sub ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Next Delivery</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-mono text-gray-600">{sub.id}</TableCell>
                  <TableCell className="font-medium text-gray-900">{sub.customerName}</TableCell>
                  <TableCell className="text-gray-800">{sub.product}</TableCell>
                  <TableCell className="text-gray-600">{sub.frequency}</TableCell>
                  <TableCell className="text-right font-medium text-gray-900">{sub.qty}</TableCell>
                  <TableCell className="text-blue-600">{sub.nextDelivery}</TableCell>
                  <TableCell>{getStatusBadge(sub.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {sub.status === 'Active' && (
                        <Button variant="ghost" size="icon" className="text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700" title="Pause">
                          <Pause size={16} />
                        </Button>
                      )}
                      {sub.status === 'Paused' && (
                        <Button variant="ghost" size="icon" className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700" title="Resume">
                          <Play size={16} />
                        </Button>
                      )}
                      {sub.status !== 'Cancelled' && (
                        <Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-50 hover:text-red-700" title="Cancel">
                          <XCircle size={16} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
