import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { ArrowLeft, MessageSquare, Star, Send, History, User, Reply } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  new: 'default', in_progress: 'warning', resolved: 'success', closed: 'outline'
};
const STATUS_LABEL: Record<string, string> = { new: 'New', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' };
const MODE_LABEL: Record<string, string> = { app: 'App', website: 'Website', call: 'Call', whatsapp: 'WhatsApp', email: 'Email' };

function fmt(dt: string) {
  return new Date(dt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function FeedbackDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const canUpdate = can('feedback', 'canUpdate');

  const [statusDraft, setStatusDraft] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [replyText, setReplyText] = useState('');
  const [error, setError] = useState('');

  const { data: feedback, isLoading } = useQuery({
    queryKey: ['feedbackDetail', id],
    queryFn: async () => {
      const res = (await api.get(`/admin/feedback/${id}`)).data.data;
      setStatusDraft(res.status);
      setReplyText(res.reply || '');
      return res;
    }
  });

  const statusMutation = useMutation({
    mutationFn: async () => api.patch(`/admin/feedback/${id}/status`, { status: statusDraft, note: statusNote.trim() || undefined }),
    onSuccess: () => { setStatusNote(''); queryClient.invalidateQueries({ queryKey: ['feedbackDetail', id] }); },
    onError: (err: any) => setError(err?.response?.data?.message || 'Unable to update status.')
  });

  const replyMutation = useMutation({
    mutationFn: async () => api.patch(`/admin/feedback/${id}/reply`, { reply: replyText.trim() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feedbackDetail', id] }),
    onError: (err: any) => setError(err?.response?.data?.message || 'Unable to save reply.')
  });

  if (isLoading || !feedback) return <div className="text-gray-500 p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/feedback')}><ArrowLeft size={16} /></Button>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <MessageSquare className="text-blue-600" /> Feedback Detail
        </h2>
        <Badge variant={STATUS_BADGE[feedback.status] || 'default'} className="ml-1">{STATUS_LABEL[feedback.status] || feedback.status}</Badge>
        <Badge variant={feedback.type === 'complaint' ? 'destructive' : 'outline'}>{feedback.type === 'complaint' ? 'Complaint' : 'Feedback'}</Badge>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><User size={18} className="text-gray-400" /> Customer</CardTitle></CardHeader>
            <CardContent className="border-t border-gray-100 pt-4 flex flex-wrap justify-between gap-4">
              <div>
                <p className="font-medium text-gray-900">{feedback.customerCode} - {feedback.customerName}</p>
                <p className="text-sm text-gray-500">{feedback.customerPhone} · {feedback.customerCity || 'No city'}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate(`/customers/${feedback.customerId}`)}>View Customer</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Feedback</CardTitle></CardHeader>
            <CardContent className="border-t border-gray-100 pt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Mode</p>
                  <p className="font-medium text-gray-900">{MODE_LABEL[feedback.feedbackMode] || feedback.feedbackMode}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Category</p>
                  <p className="font-medium text-gray-900">{feedback.categoryName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Entry By</p>
                  <p className="font-medium text-gray-900 capitalize">{feedback.entryBy} · {fmt(feedback.createdAt)}</p>
                </div>
              </div>
              {feedback.rating != null && (
                <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={16} className={i < feedback.rating ? 'fill-current' : 'text-gray-300'} />
                  ))}
                  <span className="text-sm text-gray-600 ml-1">{feedback.rating}/5</span>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 mb-1">Comment</p>
                <p className="text-gray-800 whitespace-pre-wrap">{feedback.comment || <span className="text-gray-400 italic">No comment provided.</span>}</p>
              </div>
            </CardContent>
          </Card>

          {canUpdate && (
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Reply size={18} className="text-gray-400" /> Reply to Customer</CardTitle></CardHeader>
              <CardContent className="border-t border-gray-100 pt-4 space-y-3">
                {feedback.repliedBy && (
                  <p className="text-xs text-gray-500">Last replied by {feedback.repliedBy} at {fmt(feedback.repliedAt)}</p>
                )}
                <textarea
                  className="w-full min-h-[100px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply the customer will see..."
                />
                <Button
                  className="gap-2"
                  disabled={replyMutation.isPending || !replyText.trim()}
                  onClick={() => { setError(''); replyMutation.mutate(); }}
                >
                  <Send size={16} /> {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
                </Button>
                <p className="text-xs text-gray-500">Sending a reply automatically marks this feedback as Resolved.</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {canUpdate && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Change Status</CardTitle></CardHeader>
              <CardContent className="border-t border-gray-100 pt-4 space-y-3">
                <Select value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)}>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
                <textarea
                  className="w-full min-h-[70px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Optional note (visible only to admin team)"
                />
                <Button
                  variant="outline"
                  className="gap-2 w-full justify-center"
                  disabled={statusMutation.isPending || statusDraft === feedback.status && !statusNote.trim()}
                  onClick={() => { setError(''); statusMutation.mutate(); }}
                >
                  {statusMutation.isPending ? 'Updating...' : 'Update Status'}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><History size={18} className="text-gray-400" /> Status History</CardTitle></CardHeader>
            <CardContent className="border-t border-gray-100 pt-4">
              <ol className="space-y-4">
                {feedback.history.map((h: any) => (
                  <li key={h.id} className="relative pl-4 border-l-2 border-gray-200">
                    <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-blue-500" />
                    <Badge variant={STATUS_BADGE[h.status] || 'default'} className="mb-1">{STATUS_LABEL[h.status] || h.status}</Badge>
                    {h.note && <p className="text-sm text-gray-700">{h.note}</p>}
                    <p className="text-xs text-gray-500 mt-0.5">{h.changedBy || 'System'} · {fmt(h.createdAt)}</p>
                  </li>
                ))}
                {feedback.history.length === 0 && <p className="text-sm text-gray-500">No status changes yet.</p>}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
