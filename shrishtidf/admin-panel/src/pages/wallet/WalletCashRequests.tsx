import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Banknote, Check, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' }
];

function statusBadge(status: string) {
  if (status === 'approved') return <Badge variant="success">Approved</Badge>;
  if (status === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="warning">Pending</Badge>;
}

/**
 * Customers can ask to top up their wallet by handing cash to the delivery
 * staff instead of paying online ("Request Cash" in the app). Those requests
 * land here — approving credits the wallet immediately, rejecting closes it
 * out with a reason the customer's history will show.
 */
export default function WalletCashRequests() {
  const { can } = useAuth();
  const [status, setStatus] = useState('pending');
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();
  const canReview = can('wallet_report', 'canCreate');

  const { data, isLoading } = useQuery({
    queryKey: ['walletCashRequests', status],
    queryFn: async () => (await api.get('/admin/wallet/cash-requests', { params: { status, pageSize: 50 } })).data.data
  });

  const rows = data?.rows || [];
  const total = data?.total ?? 0;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['walletCashRequests'] });

  const approve = useMutation({
    mutationFn: async (id: string) => api.post(`/admin/wallet/cash-requests/${id}/approve`),
    onSuccess: invalidate
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/admin/wallet/cash-requests/${id}/reject`, { reason }),
    onSuccess: () => {
      invalidate();
      setRejecting(null);
      setReason('');
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Banknote className="text-emerald-600" /> Wallet Cash Requests
        </h2>
        <p className="text-gray-500 mt-1">
          "Request Cash" top-ups from the app — approve once the cash is collected, or reject with a reason.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Requests</CardTitle>
              <CardDescription>{isLoading ? 'Loading...' : `Total ${total} results`}</CardDescription>
            </div>
            <div className="w-44">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Pickup Date</TableHead>
                <TableHead>Requested On</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <span className="font-medium text-gray-900 block">{r.customerName || '—'}</span>
                    <span className="text-xs font-mono text-blue-600">{r.customerCode}</span>
                  </TableCell>
                  <TableCell className="text-gray-800">{r.mobile}</TableCell>
                  <TableCell className="text-right font-semibold text-gray-900">₹{r.amount}</TableCell>
                  <TableCell className="text-gray-700">{new Date(r.requestedDate).toLocaleDateString('en-IN')}</TableCell>
                  <TableCell className="text-gray-700">{new Date(r.createdAt).toLocaleDateString('en-IN')}</TableCell>
                  <TableCell>
                    {statusBadge(r.status)}
                    {r.status === 'rejected' && r.notes && (
                      <p className="text-xs text-gray-400 mt-1 max-w-[180px]">{r.notes}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === 'pending' && !canReview ? (
                      <span className="text-xs text-gray-400">Awaiting review</span>
                    ) : r.status === 'pending' ? (
                      rejecting === r.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <input
                            autoFocus
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Reason (optional)"
                            className="h-8 w-40 rounded-md border border-gray-300 px-2 text-xs"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={reject.isPending}
                            onClick={() => reject.mutate({ id: r.id, reason })}
                          >
                            Confirm
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setRejecting(null); setReason(''); }}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost" size="icon"
                            className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                            title="Approve — credits the wallet now"
                            disabled={approve.isPending}
                            onClick={() => approve.mutate(r.id)}
                          >
                            <Check size={16} />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            title="Reject"
                            onClick={() => setRejecting(r.id)}
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      )
                    ) : (
                      <span className="text-xs text-gray-400">
                        {r.reviewedBy ? `by ${r.reviewedBy}` : '—'}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                    No {status === 'all' ? '' : status} cash requests.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
