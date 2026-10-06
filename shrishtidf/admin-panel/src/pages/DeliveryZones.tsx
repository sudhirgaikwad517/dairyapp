import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { MapPin, Plus, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function DeliveryZones() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    pincode: '',
    area: '',
    city: '',
    fee: '',
    minOrder: '',
    active: true
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: async () => {
      const res = await api.get('/admin/zones');
      return res.data.data;
    }
  });

  const addZoneMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/admin/zones', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      setIsModalOpen(false);
      setFormData({ pincode: '', area: '', city: '', fee: '', minOrder: '', active: true });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addZoneMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <MapPin className="text-emerald-600" /> Delivery Zones
          </h2>
          <p className="text-gray-500 mt-1">Manage serviceable pincodes and delivery fees.</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
        >
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
              {zones.map((zone: any) => (
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

      {/* Add Zone Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">Add New Zone</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
                <input 
                  type="text" 
                  required
                  value={formData.pincode}
                  onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="e.g. 411014"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Area Name</label>
                  <input 
                    type="text" 
                    value={formData.area}
                    onChange={(e) => setFormData({...formData, area: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="e.g. Viman Nagar"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input 
                    type="text" 
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="e.g. Pune"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Fee (₹)</label>
                  <input 
                    type="number" 
                    value={formData.fee}
                    onChange={(e) => setFormData({...formData, fee: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Value (₹)</label>
                  <input 
                    type="number" 
                    value={formData.minOrder}
                    onChange={(e) => setFormData({...formData, minOrder: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="isActive"
                  checked={formData.active}
                  onChange={(e) => setFormData({...formData, active: e.target.checked})}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Serviceable / Active Zone
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={addZoneMutation.isPending}
                >
                  {addZoneMutation.isPending ? 'Saving...' : 'Save Zone'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
