import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ImageIcon, Upload, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

type Slot = 'splash' | 'login';

const SLOTS: { slot: Slot; title: string; description: string; aspect: string }[] = [
  {
    slot: 'splash',
    title: 'Splash Screen Image',
    description: 'Shown full-screen for a moment when the app first opens.',
    aspect: 'aspect-square max-w-[220px]'
  },
  {
    slot: 'login',
    title: 'Login Screen Image',
    description: 'Shown at the top of the "Login with Mobile Number" screen.',
    aspect: 'aspect-[4/3] max-w-[360px]'
  }
];

function AssetCard({ slot, title, description, aspect, url, onUploaded }: {
  slot: Slot;
  title: string;
  description: string;
  aspect: string;
  url: string | null;
  onUploaded: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      await api.post(`/admin/app-assets/${slot}`, formData);
    },
    onSuccess: () => { setError(''); onUploaded(); },
    onError: (err: any) => setError(err?.response?.data?.message || 'Unable to upload image.')
  });

  const removeMutation = useMutation({
    mutationFn: async () => { await api.delete(`/admin/app-assets/${slot}`); },
    onSuccess: () => { setError(''); onUploaded(); },
    onError: (err: any) => setError(err?.response?.data?.message || 'Unable to remove image.')
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="border-t border-gray-100 pt-4 space-y-4">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}

        <div className={`${aspect} w-full rounded-lg border border-dashed border-gray-300 bg-gray-50 overflow-hidden flex items-center justify-center`}>
          {url ? (
            <img src={url} alt={title} className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center text-gray-400 gap-2 p-6">
              <ImageIcon size={28} />
              <span className="text-xs">Using the app's default image</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <Button onClick={() => inputRef.current?.click()} disabled={uploadMutation.isPending} className="gap-2">
            <Upload size={16} /> {uploadMutation.isPending ? 'Uploading...' : url ? 'Replace Image' : 'Upload Image'}
          </Button>
          {url && (
            <Button
              variant="outline"
              onClick={() => removeMutation.mutate()}
              disabled={removeMutation.isPending}
              className="gap-2 text-red-600 hover:bg-red-50"
            >
              <Trash2 size={16} /> {removeMutation.isPending ? 'Removing...' : 'Reset to Default'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AppAssets() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['appAssets'],
    queryFn: async () => (await api.get('/admin/app-assets')).data.data
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['appAssets'] });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <ImageIcon className="text-blue-600" /> App Images
        </h2>
        <p className="text-gray-500 mt-1">Control the splash screen and login screen images shown in the customer app.</p>
      </div>

      {isLoading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {SLOTS.map(({ slot, title, description, aspect }) => (
            <AssetCard
              key={slot}
              slot={slot}
              title={title}
              description={description}
              aspect={aspect}
              url={slot === 'splash' ? data?.splashImageUrl : data?.loginImageUrl}
              onUploaded={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}
