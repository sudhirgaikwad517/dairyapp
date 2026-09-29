import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ListChecks, ArrowLeft, Save, RotateCcw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import AccessDenied from '../components/AccessDenied';

export default function AddEditFeedbackCategory() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { can } = useAuth();
  const allowed = can('feedback_master', isEdit ? 'canUpdate' : 'canCreate');

  const [name, setName] = useState('');
  const [status, setStatus] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: detail, isLoading } = useQuery({
    queryKey: ['feedbackCategory', id],
    queryFn: async () => (await api.get(`/admin/feedback-categories/${id}`)).data.data,
    enabled: isEdit
  });

  useEffect(() => {
    if (detail) {
      setName(detail.name || '');
      setStatus(!!detail.isActive);
    }
  }, [detail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Feedback option name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), status };
      if (isEdit) await api.patch(`/admin/feedback-categories/${id}`, payload);
      else await api.post('/admin/feedback-categories', payload);
      navigate('/feedback/master');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to save feedback option.');
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && isLoading) return <div className="text-gray-500 p-8">Loading...</div>;
  if (!allowed) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/feedback/master')}><ArrowLeft size={16} /></Button>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <ListChecks className="text-blue-600" /> {isEdit ? 'Edit Feedback Option' : 'Add New Feedback Option'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}
        <Card>
          <CardHeader><CardTitle className="text-lg">Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Feedback Options<span className="text-red-600 ml-0.5">*</span></label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Delivery Delay" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status<span className="text-red-600 ml-0.5">*</span></label>
              <div className="flex gap-6 mt-2.5">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="radio" checked={status === true} onChange={() => setStatus(true)} /> Activated
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="radio" checked={status === false} onChange={() => setStatus(false)} /> Deactivated
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="gap-2"><Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/feedback/master')} className="gap-2"><RotateCcw size={16} /> Cancel</Button>
        </div>
      </form>
    </div>
  );
}
