import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ArrowLeft, Wallet } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export default function CustomerWalletDetail() {
  const navigate = useNavigate();
  const { customerId } = useParams();

  const { data: customer } = useQuery({
    queryKey: ['customerDetail', customerId],
    queryFn: async () => (await api.get(`/admin/customers/${customerId}`)).data.data
  });

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['walletTransactions', customerId],
    queryFn: async () => (await api.get(`/admin/wallet/transactions/${customerId}`)).data.data
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/wallet/report')}><ArrowLeft size={16} /></Button>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Wallet className="text-blue-600" /> Wallet Transactions
        </h2>
      </div>

      {customer && (
        <Card>
          <CardContent className="pt-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium text-gray-900">{customer.code} - {customer.name}</p>
              <p className="text-sm text-gray-500">{customer.phone}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Current Balance</p>
              <p className={`text-2xl font-bold ${Number(customer.customer_wallets?.balance || 0) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                ₹{Number(customer.customer_wallets?.balance || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">Transaction History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance After</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="text-gray-600">{new Date(t.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                  <TableCell>{t.type === 'credit' ? <Badge variant="success">Credit</Badge> : <Badge variant="destructive">Debit</Badge>}</TableCell>
                  <TableCell className="text-gray-600 capitalize">{(t.referenceType || '—').replace(/_/g, ' ')}</TableCell>
                  <TableCell className={`text-right font-medium ${t.type === 'credit' ? 'text-emerald-600' : 'text-red-600'}`}>{t.type === 'credit' ? '+' : '-'}₹{t.amount}</TableCell>
                  <TableCell className="text-right text-gray-700">₹{t.balanceAfter}</TableCell>
                  <TableCell className="text-gray-600 max-w-xs truncate" title={t.notes}>{t.notes || '—'}</TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-gray-500">No transactions yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
