import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Printer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function OrderBill() {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: order, isLoading } = useQuery({
    queryKey: ['orderBill', id],
    queryFn: async () => (await api.get(`/admin/orders/${id}`)).data.data
  });

  if (isLoading) return <div className="text-gray-500 p-8">Loading...</div>;
  if (!order) return <div className="text-gray-500 p-8">Order not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/orders')}><ArrowLeft size={16} /></Button>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Order Bill</h2>
        </div>
        <Button onClick={() => window.print()} className="gap-2"><Printer size={16} /> Print</Button>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 space-y-6">
          <div className="flex justify-between items-start border-b border-gray-200 pb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Shrishti Dairy Farm</h3>
              <p className="text-sm text-gray-500">Tax Invoice</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold text-gray-900">{order.invoiceNumber}</p>
              <p className="text-gray-500">{order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-IN') : ''}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Billed To</p>
              <p className="font-medium text-gray-900 mt-1">{order.customerName}</p>
              <p className="text-gray-600">{order.phone}</p>
              <p className="text-gray-600">{order.address}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-500 uppercase">Delivery</p>
              <p className="text-gray-600 mt-1">{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-IN') : '—'}</p>
              <p className="text-gray-600">{order.hub || '—'}</p>
              <p className="text-gray-600">{order.deliveryBoy || 'Delivery boy not assigned'}</p>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase">
                <th className="py-2">Item</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Rate</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item: any) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-2 text-gray-900">{item.productName} <span className="text-gray-500">({item.size})</span></td>
                  <td className="py-2 text-right text-gray-700">{item.quantity}</td>
                  <td className="py-2 text-right text-gray-700">₹{item.unitPrice}</td>
                  <td className="py-2 text-right text-gray-900 font-medium">₹{item.lineTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-56 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="text-gray-900">₹{order.subtotal}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tax</span><span className="text-gray-900">₹{order.taxAmount}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Delivery Fee</span><span className="text-gray-900">₹{order.deliveryFee}</span></div>
              {order.walletAmountUsed > 0 && (
                <div className="flex justify-between"><span className="text-gray-500">Wallet Used</span><span className="text-red-600">-₹{order.walletAmountUsed}</span></div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-1 font-bold text-gray-900"><span>Total</span><span>₹{order.total}</span></div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 text-xs text-gray-500 flex justify-between">
            <span>Payment: {order.paymentMethod?.toUpperCase()} · {order.paymentStatus}</span>
            <span>Status: {order.status}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
