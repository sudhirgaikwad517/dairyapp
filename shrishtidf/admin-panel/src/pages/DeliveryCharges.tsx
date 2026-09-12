import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Truck, Plus, Edit, Trash2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function DeliveryCharges() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['deliveryCharges'],
    queryFn: async () => (await api.get('/admin/delivery-charges')).data.data
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this delivery charge tier?')) return;
    await api.delete(`/admin/delivery-charges/${id}`);
    queryClient.invalidateQueries({ queryKey: ['deliveryCharges'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Truck className="text-blue-600" /> Delivery Charge
          </h2>
          <p className="text-gray-500 mt-1">Delivery fee tiers based on order value. Ranges should not overlap.</p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/delivery-charges/new')}>
          <Plus size={16} /> Add Delivery Charge
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Delivery Charge</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : `Displaying ${rows.length} results`}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Charge From (₹)</TableHead>
                <TableHead>Charge To (₹)</TableHead>
                <TableHead>Delivery Charge (₹)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="text-gray-800 font-medium">₹{t.chargeFrom}</TableCell>
                  <TableCell className="text-gray-800 font-medium">₹{t.chargeTo}</TableCell>
                  <TableCell className="font-medium text-gray-900">₹{t.charge}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={() => navigate(`/delivery-charges/${t.id}`)}>
                        <Edit size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleDelete(t.id)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={4} className="text-center py-6 text-gray-500">No delivery charge tiers found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
