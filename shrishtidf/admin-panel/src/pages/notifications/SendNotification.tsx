import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Bell, ArrowLeft, Send, RotateCcw, Users, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import AccessDenied from '../../components/AccessDenied';

const emptyFilters = { isActiveFilter: '', customerType: '', city: '', subscriptionStatus: '', deliveryBoyId: '' };

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}{required && <span className="text-red-600 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

export default function SendNotification() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [filters, setFilters] = useState(emptyFilters);
  const [debouncedFilters, setDebouncedFilters] = useState(emptyFilters);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const { data: deliveryBoys = [] } = useQuery({ queryKey: ['deliveryBoysLite'], queryFn: async () => (await api.get('/admin/delivery-boys')).data.data });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilters(filters), 350);
    return () => clearTimeout(t);
  }, [filters]);

  const { data: audience, isFetching: audienceLoading } = useQuery({
    queryKey: ['notificationAudiencePreview', debouncedFilters],
    queryFn: async () => {
      const params: Record<string, string> = {};
      Object.entries(debouncedFilters).forEach(([k, v]) => { if (v) params[k] = v; });
      return (await api.get('/admin/notifications/audience-preview', { params })).data.data;
    }
  });

  const handleReset = () => { setFilters(emptyFilters); setDebouncedFilters(emptyFilters); };

  const doSend = async () => {
    setSending(true);
    setError('');
    try {
      const payload: Record<string, string> = { title: title.trim(), message: message.trim() };
      Object.entries(filters).forEach(([k, v]) => { if (v) payload[k] = v; });
      const res = await api.post('/admin/notifications', payload);
      navigate(`/notifications/${res.data.data.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to send notification.');
      setConfirming(false);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || !message.trim()) {
      setError('Title and message are required.');
      return;
    }
    setConfirming(true);
  };

  if (!can('notifications', 'canCreate')) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/notifications')}><ArrowLeft size={16} /></Button>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Bell className="text-blue-600" /> Send New Notification
          </h2>
        </div>
        <AccessDenied />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/notifications')}><ArrowLeft size={16} /></Button>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Bell className="text-blue-600" /> Send New Notification
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}

        <Card>
          <CardHeader><CardTitle className="text-lg">Message</CardTitle></CardHeader>
          <CardContent className="space-y-4 border-t border-gray-100 pt-4">
            <Field label="Title" required>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Diwali Offer" maxLength={255} required />
            </Field>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Message<span className="text-red-600 ml-0.5">*</span></label>
              <textarea
                className="w-full min-h-[110px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What should the customer see?"
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Audience Filters</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 border-t border-gray-100 pt-4">
            <Field label="Customer Status">
              <Select value={filters.isActiveFilter} onChange={(e) => setFilters((f) => ({ ...f, isActiveFilter: e.target.value }))}>
                <option value="">All (Active + Inactive)</option>
                <option value="active">Active Customers Only</option>
                <option value="inactive">Inactive Customers Only</option>
              </Select>
            </Field>
            <Field label="Customer Type">
              <Select value={filters.customerType} onChange={(e) => setFilters((f) => ({ ...f, customerType: e.target.value }))}>
                <option value="">All Types</option>
                <option value="prepaid">Prepaid</option>
                <option value="postpaid">Postpaid</option>
              </Select>
            </Field>
            <Field label="City">
              <Input value={filters.city} onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))} placeholder="e.g. Pune" />
            </Field>
            <Field label="Subscription Status">
              <Select value={filters.subscriptionStatus} onChange={(e) => setFilters((f) => ({ ...f, subscriptionStatus: e.target.value }))}>
                <option value="">All</option>
                <option value="active">Active Subscription</option>
                <option value="paused">Paused Subscription</option>
                <option value="cancelled">Cancelled Subscription</option>
                <option value="none">No Subscription</option>
              </Select>
            </Field>
            <Field label="Delivery Boy">
              <Select value={filters.deliveryBoyId} onChange={(e) => setFilters((f) => ({ ...f, deliveryBoyId: e.target.value }))}>
                <option value="">All Delivery Boys</option>
                {deliveryBoys.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
          </CardContent>
          <CardContent className="pt-0">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
              <div className="flex items-center gap-2 text-blue-800 font-medium">
                <Users size={18} />
                {audienceLoading ? (
                  <span className="inline-flex items-center gap-1 text-blue-700"><Loader2 size={14} className="animate-spin" /> Calculating audience...</span>
                ) : (
                  <span>{audience?.count ?? 0} customer{(audience?.count ?? 0) === 1 ? '' : 's'} will receive this notification</span>
                )}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleReset} className="gap-2"><RotateCcw size={14} /> Reset Filters</Button>
            </div>
            {!audienceLoading && audience?.sample?.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">e.g. {audience.sample.join(', ')}{audience.count > audience.sample.length ? '…' : ''}</p>
            )}
          </CardContent>
        </Card>

        {!confirming ? (
          <div className="flex gap-3">
            <Button type="submit" disabled={audienceLoading} className="gap-2"><Send size={16} /> Review & Send</Button>
            <Button type="button" variant="outline" onClick={() => navigate('/notifications')} className="gap-2"><RotateCcw size={16} /> Cancel</Button>
          </div>
        ) : (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6 space-y-3">
              <p className="text-sm text-amber-900">
                This will immediately send <strong>"{title}"</strong> to <strong>{audience?.count ?? 0} customer{(audience?.count ?? 0) === 1 ? '' : 's'}</strong>. This cannot be undone. Continue?
              </p>
              <div className="flex gap-3">
                <Button type="button" disabled={sending} onClick={doSend} className="gap-2"><Send size={16} /> {sending ? 'Sending...' : 'Yes, Send Now'}</Button>
                <Button type="button" variant="outline" disabled={sending} onClick={() => setConfirming(false)}>Go Back</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
