import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { PauseCircle, PlayCircle, Search, RotateCcw, Download } from 'lucide-react';
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

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: React.ReactNode; tone: 'warning' | 'success' }) {
  const toneClass = tone === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-yellow-50 border-yellow-200 text-yellow-600';
  return (
    <Card>
      <CardContent className="pt-6 flex items-center gap-4">
        <div className={`p-3 rounded-lg border ${toneClass}`}><Icon size={20} /></div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PauseResumeRequestReport() {
  const [customer, setCustomer] = useState<any>(null);
  const [pauseDate, setPauseDate] = useState('');
  const [resumeDate, setResumeDate] = useState('');
  const [applied, setApplied] = useState<{ customerId?: string; pauseDate?: string; resumeDate?: string }>({});
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['pauseResumeReport', applied],
    queryFn: async () => {
      const params: Record<string, string> = {};
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v as string; });
      return (await api.get('/admin/reports/pause-resume', { params })).data.data;
    }
  });

  const rows = data?.rows || [];
  const stats = useMemo(() => {
    const resumed = rows.filter((r: any) => r.resumeDate).length;
    return { paused: rows.length, resumed, stillPaused: rows.length - resumed };
  }, [rows]);

  const handleSearch = () => setApplied({ customerId: customer?.id, pauseDate, resumeDate });
  const handleReset = () => { setCustomer(null); setPauseDate(''); setResumeDate(''); setApplied({}); };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = {};
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v as string; });
      const res = await api.get('/admin/reports/pause-resume/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pause-resume-report-${Date.now()}.csv`);
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
            <PauseCircle className="text-blue-600" /> Pause Resume Request Report
          </h2>
          <p className="text-gray-500 mt-1">Every subscription pause paired with its matching resume, if any.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-2">
          <Download size={16} /> {exporting ? 'Exporting...' : 'Export to Excel'}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={PauseCircle} label="Paused" value={stats.paused} tone="warning" />
        <StatCard icon={PlayCircle} label="Resumed" value={stats.resumed} tone="success" />
        <StatCard icon={PauseCircle} label="Still Paused" value={stats.stillPaused} tone="warning" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent className="space-y-4 border-t border-gray-100 pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pause Date">
              <Input type="date" value={pauseDate} onChange={(e) => setPauseDate(e.target.value)} />
            </Field>
            <Field label="Resume Date">
              <Input type="date" value={resumeDate} onChange={(e) => setResumeDate(e.target.value)} />
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
          <Button onClick={handleSearch} className="gap-2"><Search size={16} /> Search</Button>
          <Button variant="outline" onClick={handleReset} className="gap-2"><RotateCcw size={16} /> Reset</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : `${rows.length} results`}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Name</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Pause Request Date</TableHead>
                <TableHead>Pause Date</TableHead>
                <TableHead>Resume Request Date</TableHead>
                <TableHead>Resume Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium text-gray-900">{r.customerName}</TableCell>
                  <TableCell className="text-gray-700">{r.plan}</TableCell>
                  <TableCell className="text-gray-600">{r.pauseRequestDate ? new Date(r.pauseRequestDate).toLocaleDateString('en-IN') : '—'}</TableCell>
                  <TableCell className="text-gray-600">{r.pauseDate ? new Date(r.pauseDate).toLocaleDateString('en-IN') : '—'}</TableCell>
                  <TableCell className="text-gray-600">{r.resumeRequestDate ? new Date(r.resumeRequestDate).toLocaleDateString('en-IN') : '—'}</TableCell>
                  <TableCell className="text-gray-600">{r.resumeDate ? new Date(r.resumeDate).toLocaleDateString('en-IN') : '—'}</TableCell>
                  <TableCell>{r.resumeDate ? <Badge variant="success">Resumed</Badge> : <Badge variant="warning">Still Paused</Badge>}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-gray-500">No results found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
