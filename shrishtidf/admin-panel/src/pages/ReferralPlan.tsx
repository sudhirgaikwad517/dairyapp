import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Gift, Save } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function ReferralPlan() {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['referralPlan'],
    queryFn: async () => (await api.get('/admin/referral-plan')).data.data
  });

  useEffect(() => {
    if (data) setContent(data.content || '');
  }, [data]);

  const mutation = useMutation({
    mutationFn: async () => {
      await api.patch('/admin/referral-plan', { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referralPlan'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Gift className="text-blue-600" /> Refer &amp; Earn Plan
        </h2>
        <p className="text-gray-500 mt-1">Shown on the app's Refer &amp; Earn screen, describing how the referral reward works.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Plan Description</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : 'Plain text explaining the referral reward.'}</CardDescription>
        </CardHeader>
        <CardContent className="border-t border-gray-100 pt-4 space-y-4">
          <textarea
            className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Invite your friends and family to Shrishti Dairy Farm..."
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
