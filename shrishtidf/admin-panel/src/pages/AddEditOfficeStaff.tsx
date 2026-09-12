import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { UserCog, ArrowLeft, Save, RotateCcw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

const emptyForm = {
  name: '', email: '', contactNo: '', address: '', staffTypeId: '',
  username: '', password: '', photoUrl: '', aadharUrl: '', status: true
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

export default function AddEditOfficeStaff() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: staffTypes = [] } = useQuery({
    queryKey: ['staffTypesLite'],
    queryFn: async () => (await api.get('/admin/staff-types')).data.data
  });

  const { data: detail, isLoading } = useQuery({
    queryKey: ['officeStaffDetail', id],
    queryFn: async () => (await api.get(`/admin/office-staff/${id}`)).data.data,
    enabled: isEdit
  });

  useEffect(() => {
    if (detail) {
      setForm({
        name: detail.name || '',
        email: detail.email || '',
        contactNo: detail.contactNo || '',
        address: detail.address || '',
        staffTypeId: detail.staffTypeId || '',
        username: detail.username || '',
        password: '', // Never prefilled — the stored hash can't be shown, and shouldn't be.
        photoUrl: detail.photoUrl || '',
        aadharUrl: detail.aadharUrl || '',
        status: !!detail.isActive
      });
    }
  }, [detail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim() || !form.email.trim() || !form.contactNo.trim() || !form.staffTypeId || !form.username.trim()) {
      setError('Name, email, contact number, staff type and username are required.');
      return;
    }
    if (!isEdit && !form.password) {
      setError('Password is required for a new staff account.');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        email: form.email.trim(),
        contactNo: form.contactNo.trim(),
        address: form.address || undefined,
        staffTypeId: form.staffTypeId,
        username: form.username.trim(),
        photoUrl: form.photoUrl || undefined,
        aadharUrl: form.aadharUrl || undefined,
        status: form.status
      };
      if (form.password) payload.password = form.password;

      if (isEdit) await api.patch(`/admin/office-staff/${id}`, payload);
      else await api.post('/admin/office-staff', payload);
      navigate('/office-staff');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to save office staff.');
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && isLoading) return <div className="text-gray-500 p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/office-staff')}><ArrowLeft size={16} /></Button>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <UserCog className="text-blue-600" /> {isEdit ? 'Edit Office Staff' : 'Add New Office Staff'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}

        <Card>
          <CardHeader><CardTitle className="text-lg">Staff Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 border-t border-gray-100 pt-4">
            <Field label="Name" required>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </Field>
            <Field label="Email" required>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
            </Field>
            <Field label="Contact No" required>
              <Input value={form.contactNo} onChange={(e) => setForm((f) => ({ ...f, contactNo: e.target.value }))} required />
            </Field>
            <Field label="Staff Type" required>
              <Select value={form.staffTypeId} onChange={(e) => setForm((f) => ({ ...f, staffTypeId: e.target.value }))} required>
                <option value="">Select Staff Type</option>
                {staffTypes.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}{s.isActive === false ? ' (Inactive)' : ''}</option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Address">
                <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              </Field>
            </div>
            <Field label="Photo URL">
              <Input value={form.photoUrl} onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))} placeholder="https://..." />
            </Field>
            <Field label="Aadhar Card URL">
              <Input value={form.aadharUrl} onChange={(e) => setForm((f) => ({ ...f, aadharUrl: e.target.value }))} placeholder="https://..." />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Login Credentials</CardTitle>
            <CardDescription>{isEdit ? 'Leave the password blank to keep the current one unchanged.' : 'Set the initial username and password for this staff member.'}</CardDescription>
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

        <Card>
          <CardHeader><CardTitle className="text-lg">Status</CardTitle></CardHeader>
          <CardContent className="border-t border-gray-100 pt-4">
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="radio" checked={form.status === true} onChange={() => setForm((f) => ({ ...f, status: true }))} /> Activated
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="radio" checked={form.status === false} onChange={() => setForm((f) => ({ ...f, status: false }))} /> Deactivated
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="gap-2"><Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/office-staff')} className="gap-2"><RotateCcw size={16} /> Cancel</Button>
        </div>
      </form>
    </div>
  );
}
