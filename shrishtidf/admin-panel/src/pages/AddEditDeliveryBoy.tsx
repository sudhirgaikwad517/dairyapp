import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Bike, ArrowLeft, Save, RotateCcw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

const emptyForm = {
  firstName: '', middleName: '', lastName: '', dateOfBirth: '', phone: '', address: '',
  city: '', hubId: '', photoUrl: '', aadharUrl: '', username: '', password: '', status: true
};

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

export default function AddEditDeliveryBoy() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: hubs = [] } = useQuery({ queryKey: ['hubsLite'], queryFn: async () => (await api.get('/admin/hubs')).data.data });

  const { data: detail, isLoading } = useQuery({
    queryKey: ['deliveryBoy', id],
    queryFn: async () => (await api.get(`/admin/logistics/delivery-boys/${id}`)).data.data,
    enabled: isEdit
  });

  useEffect(() => {
    if (detail) {
      setForm({
        firstName: detail.firstName || '',
        middleName: detail.middleName || '',
        lastName: detail.lastName || '',
        dateOfBirth: detail.dateOfBirth ? String(detail.dateOfBirth).slice(0, 10) : '',
        phone: detail.phone || '',
        address: detail.address || '',
        city: detail.city || '',
        hubId: detail.hubId || '',
        photoUrl: detail.photoUrl || '',
        aadharUrl: detail.aadharUrl || '',
        username: detail.username || '',
        password: '',
        status: !!detail.isActive
      });
    }
  }, [detail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.firstName.trim() || !form.lastName.trim() || !form.dateOfBirth || !form.phone.trim() || !form.address.trim() || !form.city.trim() || !form.username.trim()) {
      setError('First name, last name, date of birth, mobile, address, city and username are required.');
      return;
    }
    if (!isEdit && !form.password) {
      setError('Password is required for a new delivery boy account.');
      return;
    }
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (!payload.password) delete payload.password;
      if (isEdit) await api.patch(`/admin/logistics/delivery-boys/${id}`, payload);
      else await api.post('/admin/logistics/delivery-boys', payload);
      navigate('/logistics/delivery-boys');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to save delivery boy.');
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && isLoading) return <div className="text-gray-500 p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/logistics/delivery-boys')}><ArrowLeft size={16} /></Button>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Bike className="text-blue-600" /> {isEdit ? 'Edit Delivery Boy' : 'Add New Delivery Boy'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}

        <Card>
          <CardHeader><CardTitle className="text-lg">Personal Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 border-t border-gray-100 pt-4">
            <Field label="First Name" required>
              <Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} required />
            </Field>
            <Field label="Middle Name">
              <Input value={form.middleName} onChange={(e) => setForm((f) => ({ ...f, middleName: e.target.value }))} />
            </Field>
            <Field label="Last Name" required>
              <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} required />
            </Field>
            <Field label="Date of Birth" required>
              <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} required />
            </Field>
            <Field label="Mobile No" required>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
            </Field>
            <Field label="City" required>
              <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} required />
            </Field>
            <Field label="Hub">
              <Select value={form.hubId} onChange={(e) => setForm((f) => ({ ...f, hubId: e.target.value }))}>
                <option value="">Select Hub</option>
                {hubs.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </Select>
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Address" required>
                <textarea
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-h-[80px]"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  required
                />
              </Field>
            </div>
            <Field label="Photo URL">
              <Input value={form.photoUrl} onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))} placeholder="https://..." />
            </Field>
            <Field label="Aadhar Card URL">
              <Input value={form.aadharUrl} onChange={(e) => setForm((f) => ({ ...f, aadharUrl: e.target.value }))} placeholder="https://..." />
            </Field>
            <Field label="Status" required>
              <div className="flex gap-6 mt-2.5">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="radio" checked={form.status === true} onChange={() => setForm((f) => ({ ...f, status: true }))} /> Activated
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="radio" checked={form.status === false} onChange={() => setForm((f) => ({ ...f, status: false }))} /> Deactivated
                </label>
              </div>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Login Details</CardTitle>
            <CardDescription>{isEdit ? 'Leave the password blank to keep the current one unchanged.' : 'Set the initial username and password for this delivery boy.'}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
            <Field label="Username" required>
              <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} autoComplete="off" required />
            </Field>
            <Field label={isEdit ? 'New Password' : 'Password'} required={!isEdit}>
              <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} autoComplete="new-password" placeholder={isEdit ? 'Leave blank to keep unchanged' : ''} required={!isEdit} />
            </Field>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="gap-2"><Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/logistics/delivery-boys')} className="gap-2"><RotateCcw size={16} /> Cancel</Button>
        </div>
      </form>
    </div>
  );
}
