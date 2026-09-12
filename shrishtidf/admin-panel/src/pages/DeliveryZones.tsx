import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { MapPin, Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function DeliveryZones() {
  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: async () => {
      const res = await api.get('/admin/zones');
      return res.data.data;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <MapPin className="text-emerald-600" /> Delivery Zones
          </h2>
          <p className="text-gray-500 mt-1">Manage serviceable pincodes and delivery fees.</p>
        </div>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          <Plus size={18} /> Add Zone
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Serviceable Pincodes</CardTitle>
          <CardDescription>Configure where you deliver and route assignments.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pincode</TableHead>
                <TableHead>Area / City</TableHead>
                <TableHead>Route Assigned</TableHead>
                <TableHead className="text-right">Delivery Fee</TableHead>
                <TableHead className="text-right">Min Order</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((zone) => (
                <TableRow key={zone.id}>
                  <TableCell className="font-bold text-gray-900">{zone.pincode}</TableCell>
                  <TableCell>
                    <span className="text-gray-700">{zone.area}</span>
                    <span className="text-gray-500 block text-xs">{zone.city}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50">
                      {zone.route}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-gray-800 font-medium">₹{zone.fee}</TableCell>
                  <TableCell className="text-right text-gray-800 font-medium">₹{zone.minOrder}</TableCell>
                  <TableCell className="text-right">
                    {zone.active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
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
