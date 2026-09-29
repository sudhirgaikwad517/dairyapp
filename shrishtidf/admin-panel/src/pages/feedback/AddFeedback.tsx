import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { MessageSquare, ArrowLeft, Save, RotateCcw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import CustomerPicker from '../../components/CustomerPicker';
import { useAuth } from '../../context/AuthContext';
import AccessDenied from '../../components/AccessDenied';

const MODE_OPTIONS = [
  { value: 'call', label: 'Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'website', label: 'Website' },
  { value: 'app', label: 'App' }
];
const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' }
];

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}{required && <span className="text-red-600 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

export default function AddFeedback() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [customer, setCustomer] = useState<any>(null);
  const [feedbackMode, setFeedbackMode] = useState('');
  const [status, setStatus] = useState('new');
  const [categoryId, setCategoryId] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['feedbackCategoriesActive'],
    queryFn: async () => (await api.get('/admin/feedback-categories', { params: { activeOnly: 'true' } })).data.data
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!customer || !feedbackMode) {
      setError('Customer and feedback mode are required.');
      return;
    }
    setSaving(true);
    try {
      const created = await api.post('/admin/feedback', {
        customerId: customer.id,
        feedbackMode,
        status,
        feedbackCategoryId: categoryId || null,
        comment: comment.trim() || null
      });
      navigate(`/feedback/${created.data.data.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to save feedback.');
    } finally {
      setSaving(false);
    }
  };

  if (!can('feedback', 'canCreate')) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/feedback')}><ArrowLeft size={16} /></Button>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <MessageSquare className="text-blue-600" /> Add Feedback
          </h2>
        </div>
        <AccessDenied />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/feedback')}><ArrowLeft size={16} /></Button>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <MessageSquare className="text-blue-600" /> Add Feedback
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}

        <Card>
          <CardHeader><CardTitle className="text-lg">Customer</CardTitle></CardHeader>
          <CardContent className="border-t border-gray-100 pt-4">
            {customer ? (
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium text-gray-900">{customer.code} - {customer.name}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => setCustomer(null)}>Change</Button>
              </div>
            ) : (
              <CustomerPicker onSelect={(c) => setCustomer(c)} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Feedback Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
            <Field label="Feedback Mode" required>
              <Select value={feedbackMode} onChange={(e) => setFeedbackMode(e.target.value)} required>
                <option value="">Select Feedback Mode</option>
                {MODE_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
            </Field>
            <Field label="Feedback Status" required>
              <Select value={status} onChange={(e) => setStatus(e.target.value)} required>
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </Field>
            <Field label="Feedback Options">
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Select Feedback Category</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Comment</label>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did the customer say?"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="gap-2"><Save size={16} /> {saving ? 'Saving...' : 'Save'}</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/feedback')} className="gap-2"><RotateCcw size={16} /> Cancel</Button>
        </div>
      </form>
    </div>
  );
}
