import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Truck, Printer, FileDown } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatDateOnly } from '../lib/utils';

export default function DispatchSheet() {
  const [date, setDate] = useState(() => formatDateOnly(new Date()));

  const { data: routes = [] } = useQuery({
    queryKey: ['dispatch', date],
    queryFn: async () => {
      const res = await api.get('/admin/dispatch', { params: { date } });
      return res.data.data;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Truck className="text-blue-400" /> Dispatch Sheet
          </h2>
          <p className="text-gray-500 mt-1">Daily routing and inventory packing lists.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-[150px]"
          />
          <Button variant="outline" className="gap-2">
            <Printer size={16} /> Print All
          </Button>
          <Button className="gap-2">
            <FileDown size={16} /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {routes.map((route) => (
          <Card key={route.id} className="relative overflow-hidden group">
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <CardHeader className="border-b border-gray-100 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl text-gray-900">{route.name}</CardTitle>
                  <CardDescription className="mt-1">Driver: <span className="text-gray-600 font-medium">{route.driver}</span></CardDescription>
                </div>
                <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">
                  {route.totalOrders} Orders
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  <span>Product</span>
                  <span>Qty</span>
                </div>
                
                {route.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-800">{item.name}</span>
                      <span className="text-xs text-gray-500">{item.type}</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900 bg-white px-3 py-1 rounded-md border border-gray-200">
                      {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
