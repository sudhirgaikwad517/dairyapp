import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Image as ImageIcon, ArrowLeft, Edit } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pb-3 border-b border-gray-100">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <div className="text-sm text-gray-900 mt-1">{children || '—'}</div>
    </div>
  );
}

const statusBadge = (status: string) => {
  if (status === 'Activated') return <Badge variant="success">Activated</Badge>;
  if (status === 'Scheduled') return <Badge variant="warning">Scheduled</Badge>;
  if (status === 'Expired') return <Badge variant="outline">Expired</Badge>;
  return <Badge variant="outline">Deactivated</Badge>;
};

export default function ViewBanner() {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: b, isLoading } = useQuery({
    queryKey: ['banner', id],
    queryFn: async () => (await api.get(`/admin/banners/${id}`)).data.data
  });

  if (isLoading) {
    return <div className="text-gray-500 p-8">Loading banner...</div>;
  }
  if (!b) {
    return <div className="text-gray-500 p-8">Banner not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/banners')}>
            <ArrowLeft size={16} />
          </Button>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <ImageIcon className="text-blue-600" /> Banner Details
          </h2>
        </div>
        <Button className="gap-2" onClick={() => navigate(`/banners/${id}`)}>
          <Edit size={16} /> Edit
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{b.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2 border-t border-gray-100 pt-4">
          <Field label="Type"><span className="capitalize">{b.banner_type}</span></Field>
          <Field label="Status">{statusBadge(b.status)}</Field>
          <Field label="From Date">{b.from_date ? new Date(b.from_date).toLocaleDateString('en-IN') : 'All Time'}</Field>
          <Field label="To Date">{b.to_date ? new Date(b.to_date).toLocaleDateString('en-IN') : 'All Time'}</Field>
          <div className="sm:col-span-2">
            <Field label="Media">
              {b.banner_type === 'video' ? (
                <video src={b.media_url} controls className="w-full max-w-md h-40 object-contain rounded-lg border border-gray-200 bg-black" />
              ) : (
                <img src={b.media_url} alt={b.title} className="w-full max-w-md h-40 object-cover rounded-lg border border-gray-200" />
              )}
            </Field>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
