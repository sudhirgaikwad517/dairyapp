import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { UserCog, ArrowLeft, Edit, ShieldCheck } from 'lucide-react';
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

export default function ViewOfficeStaff() {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: s, isLoading } = useQuery({
    queryKey: ['officeStaffDetail', id],
    queryFn: async () => (await api.get(`/admin/office-staff/${id}`)).data.data
  });

  if (isLoading) return <div className="text-gray-500 p-8">Loading...</div>;
  if (!s) return <div className="text-gray-500 p-8">Office staff not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/office-staff')}><ArrowLeft size={16} /></Button>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <UserCog className="text-blue-600" /> Office Staff Details
          </h2>
        </div>
        <Button className="gap-2" onClick={() => navigate(`/office-staff/${id}`)}><Edit size={16} /> Edit</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">{s.name}</CardTitle></CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2 border-t border-gray-100 pt-4">
          <Field label="Email">{s.email}</Field>
          <Field label="Contact No">{s.contactNo}</Field>
          <Field label="Address">{s.address}</Field>
          <Field label="Staff Type">{s.staffType}</Field>
          <Field label="Username">{s.username}</Field>
          <Field label="Password">
            <span className="inline-flex items-center gap-1.5 text-gray-500">
              <ShieldCheck size={14} className="text-emerald-600" /> Encrypted — not shown for security
            </span>
          </Field>
          <Field label="Status">{s.isActive ? <Badge variant="success">Activated</Badge> : <Badge variant="destructive">Deactivated</Badge>}</Field>
          <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
            <Field label="Photo">
              {s.photoUrl ? <img src={s.photoUrl} alt={s.name} className="w-24 h-24 object-cover rounded-lg border border-gray-200" /> : 'No Photo'}
            </Field>
            <Field label="Aadhar Card Copy">
              {s.aadharUrl ? <img src={s.aadharUrl} alt="Aadhar" className="w-24 h-24 object-cover rounded-lg border border-gray-200" /> : 'No File'}
            </Field>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
