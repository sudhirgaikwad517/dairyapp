import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Archive, Plus, Search, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function Inventory() {
  const [search, setSearch] = useState('');

  const { data: batches = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await api.get('/admin/inventory');
      return res.data.data;
    }
  });

  const filtered = batches.filter((b: any) => (b.product || '').toLowerCase().includes(search.toLowerCase()) || (b.id || '').toLowerCase().includes(search.toLowerCase()));

  const expiringSoonCount = batches.filter((b: any) => b.status === 'Expiring Soon').length;
  const lowStockCount = batches.filter((b: any) => b.status === 'Low Stock' || b.status === 'Empty').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Good': return <Badge variant="success">Good</Badge>;
      case 'Low Stock': return <Badge variant="warning">Low Stock</Badge>;
      case 'Empty': return <Badge variant="destructive">Empty</Badge>;
      case 'Expiring Soon': return <Badge variant="destructive" className="bg-orange-100 text-orange-700">Expiring Soon</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Archive className="text-purple-600" /> Inventory Batches
          </h2>
          <p className="text-gray-500 mt-1">Manage stock levels and track expiry dates.</p>
        </div>
        <Button className="gap-2 bg-purple-600 hover:bg-purple-700 shadow-[0_0_20px_rgba(147,51,234,0.3)]">
          <Plus size={18} /> Add Batch
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg text-red-600">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-red-600">Expiring Soon</p>
              <h3 className="text-2xl font-bold text-gray-900">{expiringSoonCount} Batches</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/5 border-yellow-500/20">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg text-yellow-700">
              <Archive size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-yellow-700">Low Stock / Empty</p>
              <h3 className="text-2xl font-bold text-gray-900">{lowStockCount} Batches</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <CardTitle>Active Batches</CardTitle>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <Input 
                placeholder="Search by Product or Batch ID..." 
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
                <TableHead>Batch ID</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-mono text-gray-600">{batch.id}</TableCell>
                  <TableCell className="font-medium text-gray-900">{batch.product}</TableCell>
                  <TableCell className="text-gray-700">{batch.variant || '-'}</TableCell>
                  <TableCell className="text-right font-bold text-gray-900">{batch.quantity}</TableCell>
                  <TableCell className="text-gray-600">{batch.expiry}</TableCell>
                  <TableCell>{getStatusBadge(batch.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
