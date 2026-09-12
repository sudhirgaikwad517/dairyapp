import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Route as RouteIcon, ArrowLeft, Save, RotateCcw, ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

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

export default function AddEditDeliveryRoute() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [hubId, setHubId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [status, setStatus] = useState(true);
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);
  const [leftPicked, setLeftPicked] = useState<string[]>([]);
  const [rightPicked, setRightPicked] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: hubs = [] } = useQuery({ queryKey: ['hubsLite'], queryFn: async () => (await api.get('/admin/hubs')).data.data });
  const { data: deliveryBoys = [] } = useQuery({ queryKey: ['deliveryBoysLite'], queryFn: async () => (await api.get('/admin/delivery-boys')).data.data });

  const { data: availableAreas = [] } = useQuery({
    queryKey: ['areasForRoute', id],
    queryFn: async () => (await api.get('/admin/logistics/delivery-areas', { params: { unassignedFor: id || '__new__' } })).data.data
  });

  const { data: detail, isLoading } = useQuery({
    queryKey: ['deliveryRoute', id],
    queryFn: async () => (await api.get(`/admin/logistics/routes/${id}`)).data.data,
    enabled: isEdit
  });

  useEffect(() => {
    if (detail) {
      setName(detail.name || '');
      setCity(detail.city || '');
      setHubId(detail.hubId || '');
      setDriverId(detail.driverId || '');
      setStatus(!!detail.isActive);
      setSelectedAreaIds(detail.areas.map((a: any) => a.id));
    }
  }, [detail]);

  const leftAreas = availableAreas.filter((a: any) => !selectedAreaIds.includes(a.id));
  const rightAreas = availableAreas.filter((a: any) => selectedAreaIds.includes(a.id));

  const moveRight = () => { setSelectedAreaIds((ids) => [...ids, ...leftPicked]); setLeftPicked([]); };
  const moveLeft = () => { setSelectedAreaIds((ids) => ids.filter((id2) => !rightPicked.includes(id2))); setRightPicked([]); };
  const moveAllRight = () => { setSelectedAreaIds(availableAreas.map((a: any) => a.id)); setLeftPicked([]); };
  const moveAllLeft = () => { setSelectedAreaIds([]); setRightPicked([]); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !city.trim()) {
      setError('Route Name and City are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(), city: city.trim(), hubId: hubId || null, driverId: driverId || null,
        status, areaIds: selectedAreaIds
      };
      if (isEdit) await api.patch(`/admin/logistics/routes/${id}`, payload);
      else await api.post('/admin/logistics/routes', payload);
      navigate('/logistics/routes');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to save delivery route.');
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && isLoading) return <div className="text-gray-500 p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/logistics/routes')}><ArrowLeft size={16} /></Button>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <RouteIcon className="text-blue-600" /> {isEdit ? `Edit Route ${detail?.name || ''}` : 'Add New Route'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}
        <Card>
          <CardHeader><CardTitle className="text-lg">Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
            <Field label="Route Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="City" required>
              <Input value={city} onChange={(e) => setCity(e.target.value)} required />
            </Field>
            <Field label="Assign Delivery Boy">
              <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                <option value="">Select Delivery Boy</option>
                {deliveryBoys.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
            <Field label="Hub">
              <Select value={hubId} onChange={(e) => setHubId(e.target.value)}>
                <option value="">Select Hub</option>
                {hubs.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </Select>
            </Field>

            <div className="sm:col-span-2">
              <Field label="Street / Area" required>
                <div className="flex items-stretch gap-2">
                  <select
                    multiple
                    size={8}
                    className="flex-1 rounded-md border border-gray-300 bg-white text-sm p-2 [&>option]:px-2 [&>option]:py-1"
                    value={leftPicked}
                    onChange={(e) => setLeftPicked(Array.from(e.target.selectedOptions).map((o) => o.value))}
                  >
                    {leftAreas.map((a: any) => <option key={a.id} value={a.id}>{a.areaName}</option>)}
                  </select>
                  <div className="flex flex-col justify-center gap-2">
                    <Button type="button" variant="outline" size="icon" onClick={moveRight} title="Move selected right"><ChevronRight size={16} /></Button>
                    <Button type="button" variant="outline" size="icon" onClick={moveLeft} title="Move selected left"><ChevronLeft size={16} /></Button>
                    <Button type="button" variant="outline" size="icon" onClick={moveAllRight} title="Move all right"><ChevronsRight size={16} /></Button>
                    <Button type="button" variant="outline" size="icon" onClick={moveAllLeft} title="Move all left"><ChevronsLeft size={16} /></Button>
                  </div>
                  <select
                    multiple
                    size={8}
                    className="flex-1 rounded-md border border-gray-300 bg-white text-sm p-2 [&>option]:px-2 [&>option]:py-1"
                    value={rightPicked}
                    onChange={(e) => setRightPicked(Array.from(e.target.selectedOptions).map((o) => o.value))}
                  >
                    {rightAreas.map((a: any) => <option key={a.id} value={a.id}>{a.areaName}</option>)}
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-1">Left: unassigned areas. Right: areas served by this route. Select one or more (Ctrl/Cmd+click for multiple) and use the arrows to move them.</p>
              </Field>
            </div>

            <Field label="Status" required>
              <div className="flex gap-6 mt-2.5">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="radio" checked={status === true} onChange={() => setStatus(true)} /> Active
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="radio" checked={status === false} onChange={() => setStatus(false)} /> Not Active
                </label>
              </div>
            </Field>
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="gap-2"><Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/logistics/routes')} className="gap-2"><RotateCcw size={16} /> Cancel</Button>
        </div>
      </form>
    </div>
  );
}
