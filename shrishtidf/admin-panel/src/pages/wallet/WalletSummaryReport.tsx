import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Wallet, Search, RotateCcw, Download, IndianRupee, Gift, Undo2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone = 'default' }: { icon: any; label: string; value: React.ReactNode; tone?: 'default' | 'danger' | 'success' }) {
  const toneClass = tone === 'danger' ? 'bg-red-50 border-red-200 text-red-600' : tone === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-blue-50 border-blue-200 text-blue-600';
  return (
    <Card>
      <CardContent className="pt-6 flex items-center gap-4">
        <div className={`p-3 rounded-lg border ${toneClass}`}><Icon size={20} /></div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
          <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function defaultDates() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: fmt(from), to: fmt(to) };
}

export default function WalletSummaryReport() {
  const [draft, setDraft] = useState(defaultDates());
  const [applied, setApplied] = useState(draft);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['walletSummaryReport', applied],
    queryFn: async () => (await api.get('/admin/wallet/summary', { params: applied })).data.data
  });

  const rupee = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  const handleSearch = () => setApplied(draft);
  const handleReset = () => { const d = defaultDates(); setDraft(d); setApplied(d); };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/admin/wallet/summary/export', { params: applied, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `wallet-summary-report-${Date.now()}.csv`);
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
            <Wallet className="text-blue-600" /> Wallet Summary Report
          </h2>
          <p className="text-gray-500 mt-1">Recharge, cashback and refund totals across all customer wallets for a date range.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-2">
          <Download size={16} /> {exporting ? 'Exporting...' : 'Export to Excel'}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
          <Field label="From Date">
            <Input type="date" value={draft.from} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} />
          </Field>
          <Field label="To Date">
            <Input type="date" value={draft.to} min={draft.from} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} />
          </Field>
        </CardContent>
        <CardContent className="flex flex-wrap gap-3 pt-0">
          <Button onClick={handleSearch} className="gap-2"><Search size={16} /> Search</Button>
          <Button variant="outline" onClick={handleReset} className="gap-2"><RotateCcw size={16} /> Reset</Button>
        </CardContent>
      </Card>

      {isLoading && <div className="text-gray-500">Loading report...</div>}

      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard icon={IndianRupee} label="Total Recharge Amount" value={rupee(data.totalRecharge)} tone="success" />
          <StatCard icon={Gift} label="Total Cashback Amount" value={rupee(data.totalCashback)} />
          <StatCard icon={Undo2} label="Total Refunded Amount" value={rupee(data.totalRefunded)} tone="danger" />
        </div>
      )}
    </div>
  );
}
