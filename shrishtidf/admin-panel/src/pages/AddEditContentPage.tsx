import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { FileText, ArrowLeft, Save, RotateCcw, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function AddEditContentPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: detail, isLoading } = useQuery({
    queryKey: ['contentPage', id],
    queryFn: async () => (await api.get(`/admin/content-pages/${id}`)).data.data,
    enabled: isEdit
  });

  useEffect(() => {
    if (detail) {
      setSlug(detail.slug || '');
      setTitle(detail.title || '');
      setContent(detail.content || '');
      setStatus(!!detail.isActive);
    }
  }, [detail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || (!isEdit && !slug.trim())) {
      setError('Title (and slug, for a new page) are required.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await api.patch(`/admin/content-pages/${id}`, { title: title.trim(), content, status });
      } else {
        await api.post('/admin/content-pages', { slug: slug.trim().toLowerCase().replace(/\s+/g, '_'), title: title.trim(), content, status });
      }
      navigate('/content-pages');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to save page.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit || !window.confirm('Delete this page? It will disappear from the app immediately.')) return;
    await api.delete(`/admin/content-pages/${id}`);
    navigate('/content-pages');
  };

  if (isEdit && isLoading) return <div className="text-gray-500 p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/content-pages')}><ArrowLeft size={16} /></Button>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <FileText className="text-blue-600" /> {isEdit ? 'Edit Page' : 'Add New Page'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}
        <Card>
          <CardHeader><CardTitle className="text-lg">Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Title<span className="text-red-600 ml-0.5">*</span></label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Slug{!isEdit && <span className="text-red-600 ml-0.5">*</span>}</label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} disabled={isEdit} placeholder="e.g. shipping_policy" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Content<span className="text-red-600 ml-0.5">*</span></label>
              <textarea
                className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                rows={12}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Page content shown to customers in the app..."
              />
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
          <Button type="button" variant="outline" onClick={() => navigate('/content-pages')} className="gap-2"><RotateCcw size={16} /> Cancel</Button>
          {isEdit && (
            <Button type="button" variant="outline" onClick={handleDelete} className="gap-2 text-red-600 hover:bg-red-50 ml-auto"><Trash2 size={16} /> Delete</Button>
          )}
        </div>
      </form>
    </div>
  );
}
