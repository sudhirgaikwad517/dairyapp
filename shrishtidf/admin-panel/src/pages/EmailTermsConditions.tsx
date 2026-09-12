import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Mail, Save } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function EmailTermsConditions() {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['emailTerms'],
    queryFn: async () => (await api.get('/admin/email-terms')).data.data
  });

  useEffect(() => {
    if (data) setContent(data.content || '');
  }, [data]);

  const mutation = useMutation({
    mutationFn: async () => {
      await api.patch('/admin/email-terms', { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTerms'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Mail className="text-blue-600" /> Email Terms &amp; Conditions
        </h2>
        <p className="text-gray-500 mt-1">This text is appended to order confirmation and other transactional emails.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Content</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : 'Plain text or simple HTML.'}</CardDescription>
        </CardHeader>
        <CardContent className="border-t border-gray-100 pt-4 space-y-4">
          <textarea
            className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-mono"
            rows={14}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your terms & conditions text here..."
          />
          <div className="flex items-center gap-3">
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-2">
              <Save size={16} /> {mutation.isPending ? 'Saving...' : 'Save'}
            </Button>
            {saved && <span className="text-sm text-emerald-600 font-medium">Saved.</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
