import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Clock, Check, X, Edit } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => {
  const value = `${String(h).padStart(2, '0')}:00`;
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { value, label: `${hour12} ${period}` };
});

function formatTime(value: string) {
  const found = HOUR_OPTIONS.find((o) => o.value === value);
  return found ? found.label : value;
}

export default function CutOffTime() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('22:00');

  const { data, isLoading } = useQuery({
    queryKey: ['cutoffTime'],
    queryFn: async () => (await api.get('/admin/cutoff-time')).data.data
  });

  const mutation = useMutation({
    mutationFn: async (cutoffTime: string) => {
      await api.patch('/admin/cutoff-time', { cutoffTime });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cutoffTime'] });
      setEditing(false);
    }
  });

  const startEdit = () => {
    setDraft(data?.cutoffTime || '22:00');
    setEditing(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Clock className="text-blue-600" /> Cut Off Time
        </h2>
        <p className="text-gray-500 mt-1">
          Quantity changes, holidays and stop requests made before this time apply from the next day.
          After this time, tomorrow&apos;s delivery is already locked in, so the change applies from the day after.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Manage Cut Off Time</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : 'Displaying 1 of 1 result.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cut Off Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-gray-900">
                  {editing ? (
                    <div className="flex items-center gap-2">
                      <Select value={draft} onChange={(e) => setDraft(e.target.value)} className="w-32">
                        {HOUR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </Select>
                      <Button size="icon" onClick={() => mutation.mutate(draft)} disabled={mutation.isPending} title="Save">
                        <Check size={16} />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => setEditing(false)} title="Cancel">
                        <X size={16} />
                      </Button>
                    </div>
                  ) : (
                    <span>{isLoading ? '—' : formatTime(data?.cutoffTime)}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {!editing && (
                    <Button variant="ghost" size="icon" className="text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={startEdit}>
                      <Edit size={16} />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How this works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2 border-t border-gray-100 pt-4">
          <p>Example: today is the 4th and the cut off time is {isLoading ? '10 PM' : formatTime(data?.cutoffTime)}.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>A holiday or quantity change made <strong>before</strong> the cut off applies starting the <strong>5th</strong>.</li>
            <li>The same change made <strong>after</strong> the cut off applies starting the <strong>6th</strong> instead — the 5th continues as normal since tomorrow&apos;s delivery is already locked in.</li>
          </ul>
          <p className="text-gray-500">This rule is enforced by the backend for subscription holidays today, and will apply to the app&apos;s vacation-mode and quantity-change screens once they are built.</p>
        </CardContent>
      </Card>
    </div>
  );
}
