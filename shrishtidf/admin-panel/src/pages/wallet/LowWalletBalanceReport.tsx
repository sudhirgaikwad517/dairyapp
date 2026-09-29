import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AlertTriangle, Search, RotateCcw, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import CustomerPicker from '../../components/CustomerPicker';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function LowWalletBalanceReport() {
  const [customer, setCustomer] = useState<any>(null);
  const [threshold, setThreshold] = useState('300');
  const [applied, setApplied] = useState<{ customerId?: string; threshold: string }>({ threshold: '300' });
  const [exporting, setExporting] = useState(false);

  const queryKey = ['lowWalletBalance', applied];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string, string> = { threshold: applied.threshold };
      if (applied.customerId) params.customerId = applied.customerId;
      return (await api.get('/admin/wallet/low-balance', { params })).data.data;
    }
  });

  const rows = data?.rows || [];
  const total = data?.total ?? 0;

  const handleSearch = () => setApplied({ customerId: customer?.id, threshold: threshold || '300' });
  const handleReset = () => { setCustomer(null); setThreshold('300'); setApplied({ threshold: '300' }); };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = { threshold: applied.threshold };
      if (applied.customerId) params.customerId = applied.customerId;
      const res = await api.get('/admin/wallet/low-balance/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `low-wallet-balance-report-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <AlertTriangle className="text-amber-500" /> Low Wallet Balance Report
          </h2>
          <p className="text-gray-500 mt-1">Customers with a positive wallet balance below a threshold — good candidates for a top-up reminder.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-2">
          <Download size={16} /> {exporting ? 'Exporting...' : 'Export to Excel'}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent className="space-y-4 border-t border-gray-100 pt-4">
          <div className="max-w-xs">
            <Field label="Below Amount">
              <Input type="number" min={1} value={threshold} onChange={(e) => setThreshold(e.target.value)} />
            </Field>
          </div>
          <Field label="Customer">
            {customer ? (
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium text-gray-900">{customer.code} - {customer.name}</p>
                <Button variant="outline" size="sm" onClick={() => setCustomer(null)}>Clear</Button>
              </div>
            ) : (
              <CustomerPicker onSelect={(c) => setCustomer(c)} />
            )}
          </Field>
        </CardContent>
        <CardContent className="flex flex-wrap gap-3 pt-0">
          <Button onClick={handleSearch} className="gap-2"><Search size={16} /> View</Button>
          <Button variant="outline" onClick={handleReset} className="gap-2"><RotateCcw size={16} /> Reset</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Low Balance Customers</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : `Total ${total} results`}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer ID</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Wallet Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-blue-600 font-medium">{r.code}</TableCell>
                  <TableCell className="font-medium text-gray-900">{r.name}</TableCell>
                  <TableCell className="text-gray-800">{r.mobile}</TableCell>
                  <TableCell className="text-gray-700">{r.email || '—'}</TableCell>
                  <TableCell className="text-right font-medium text-amber-600">₹{r.walletAmount}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-gray-500">No customers below this threshold.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
