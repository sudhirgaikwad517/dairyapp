import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Image as ImageIcon, ArrowLeft, Save, RotateCcw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

const emptyForm = { bannerType: 'image', title: '', mediaUrl: '', fromDate: '', toDate: '', status: true };

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label}{required && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function AddEditBanner() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: bannerDetail, isLoading } = useQuery({
    queryKey: ['banner', id],
    queryFn: async () => (await api.get(`/admin/banners/${id}`)).data.data,
    enabled: isEdit
  });

  useEffect(() => {
    if (bannerDetail) {
      setForm({
        bannerType: bannerDetail.banner_type || 'image',
        title: bannerDetail.title || '',
        mediaUrl: bannerDetail.media_url || '',
        fromDate: bannerDetail.from_date ? String(bannerDetail.from_date).slice(0, 10) : '',
        toDate: bannerDetail.to_date ? String(bannerDetail.to_date).slice(0, 10) : '',
        status: !!bannerDetail.is_active
      });
    }
  }, [bannerDetail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim() || !form.mediaUrl.trim()) {
      setError('Title and media URL are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        bannerType: form.bannerType,
        title: form.title.trim(),
        mediaUrl: form.mediaUrl.trim(),
        fromDate: form.fromDate || null,
        toDate: form.toDate || null,
        status: form.status
      };
      if (isEdit) {
        await api.patch(`/admin/banners/${id}`, payload);
      } else {
        await api.post('/admin/banners', payload);
      }
      navigate('/banners');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to save banner. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && isLoading) {
    return <div className="text-gray-500 p-8">Loading banner...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/banners')}>
          <ArrowLeft size={16} />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <ImageIcon className="text-blue-600" /> {isEdit ? 'Edit Banner' : 'Add New Banner'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Banner Details</CardTitle>
            <CardDescription>
              Image banners appear in the home screen carousel (multiple allowed). Only one active video banner is used at a time.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
            <Field label="Banner Type" required>
              <Select value={form.bannerType} onChange={(e) => setForm((f) => ({ ...f, bannerType: e.target.value }))} disabled={isEdit}>
                <option value="image">Image (Carousel)</option>
                <option value="video">Video</option>
              </Select>
            </Field>
            <Field label="Title" required>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
            </Field>
            <div className="sm:col-span-2">
              <Field label={form.bannerType === 'video' ? 'Video URL' : 'Image URL'} required>
                <Input value={form.mediaUrl} onChange={(e) => setForm((f) => ({ ...f, mediaUrl: e.target.value }))} placeholder="https://..." required />
              </Field>
            </div>

            {form.mediaUrl && (
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-gray-500 mb-2">Preview</p>
                {form.bannerType === 'video' ? (
                  <video src={form.mediaUrl} controls className="w-full max-w-md h-40 object-contain rounded-lg border border-gray-200 bg-black" />
                ) : (
                  <img src={form.mediaUrl} alt="Banner preview" className="w-full max-w-md h-40 object-cover rounded-lg border border-gray-200" />
                )}
              </div>
            )}

            <Field label="From Date">
              <Input type="date" value={form.fromDate} onChange={(e) => setForm((f) => ({ ...f, fromDate: e.target.value }))} />
            </Field>
            <Field label="To Date">
              <Input type="date" value={form.toDate} onChange={(e) => setForm((f) => ({ ...f, toDate: e.target.value }))} />
            </Field>
            <p className="sm:col-span-2 text-xs text-gray-500">Leave both dates empty to show this banner &quot;All Time&quot;.</p>

            <div className="sm:col-span-2">
              <Field label="Status" required>
                <div className="flex gap-6 mt-1">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="radio" checked={form.status === true} onChange={() => setForm((f) => ({ ...f, status: true }))} /> Activated
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="radio" checked={form.status === false} onChange={() => setForm((f) => ({ ...f, status: false }))} /> Deactivated
                  </label>
                </div>
              </Field>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="gap-2">
            <Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/banners')} className="gap-2">
            <RotateCcw size={16} /> Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
