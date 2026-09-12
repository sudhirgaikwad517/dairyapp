import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { UserPlus, ArrowLeft, Save, RotateCcw, History } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

const emptyForm = {
  name: '', phone: '', alternatePhone: '', email: '', dateOfBirth: '', customerType: 'prepaid',
  residenceType: '', flatNo: '', floor: '', streetName: '', societyName: '', landmark: '',
  area: '', state: 'Maharashtra', city: '', pincode: '', deliveryMode: 'Ring the Bell',
  hubId: '', routeId: '', deliveryBoyId: '', deliveryBoyChangeNarration: '', status: true
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

export default function AddEditCustomer() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [form, setForm] = useState(emptyForm);
  const [initialDeliveryBoyId, setInitialDeliveryBoyId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: routes = [] } = useQuery({
    queryKey: ['routesLite'],
    queryFn: async () => (await api.get('/admin/routes')).data.data
  });
  const { data: hubs = [] } = useQuery({
    queryKey: ['hubsLite'],
    queryFn: async () => (await api.get('/admin/hubs')).data.data
  });
  const { data: deliveryBoys = [] } = useQuery({
    queryKey: ['deliveryBoysLite'],
    queryFn: async () => (await api.get('/admin/delivery-boys')).data.data
  });
  const { data: deliveryModes = [] } = useQuery({
    queryKey: ['deliveryModesLite'],
    queryFn: async () => (await api.get('/admin/delivery-modes', { params: { activeOnly: 'true' } })).data.data
  });

  const { data: customerDetail, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => (await api.get(`/admin/customers/${id}`)).data.data,
    enabled: isEdit
  });

  useEffect(() => {
    if (customerDetail) {
      const c = customerDetail;
      const next = {
        name: c.name || '',
        phone: c.phone || '',
        alternatePhone: c.alternate_phone || '',
        email: c.email || '',
        dateOfBirth: c.date_of_birth ? String(c.date_of_birth).slice(0, 10) : '',
        customerType: c.customer_type || 'prepaid',
        residenceType: c.residence_type || '',
        flatNo: c.flat_no || '',
        floor: '',
        streetName: c.street_name || '',
        societyName: c.society_name || '',
        landmark: c.landmark || '',
        area: c.area || '',
        state: c.state || 'Maharashtra',
        city: c.city || '',
        pincode: c.pincode || '',
        deliveryMode: c.delivery_mode || 'Ring the Bell',
        hubId: c.hub_id || '',
        routeId: c.route_id || '',
        deliveryBoyId: c.delivery_boy_id || '',
        deliveryBoyChangeNarration: '',
        status: !!c.is_active
      };
      setForm(next);
      setInitialDeliveryBoyId(c.delivery_boy_id || '');
    }
  }, [customerDetail]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleReset = () => {
    if (customerDetail) {
      // Re-trigger effect by resetting to the loaded values
      setForm((f) => ({ ...f }));
    } else {
      setForm(emptyForm);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim() || !form.phone.trim()) {
      setError('Name and mobile number are required.');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        alternatePhone: form.alternatePhone || undefined,
        email: form.email || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        customerType: form.customerType,
        residenceType: form.residenceType || undefined,
        flatNo: form.flatNo || undefined,
        streetName: form.streetName || undefined,
        societyName: form.societyName || undefined,
        landmark: form.landmark || undefined,
        area: form.area || undefined,
        state: form.state || undefined,
        city: form.city || undefined,
        pincode: form.pincode || undefined,
        deliveryMode: form.deliveryMode,
        hubId: form.hubId || null,
        routeId: form.routeId || null,
        deliveryBoyId: form.deliveryBoyId || null,
        status: form.status
      };

      if (form.deliveryBoyId !== initialDeliveryBoyId) {
        payload.deliveryBoyChangeNarration = form.deliveryBoyChangeNarration || undefined;
      }

      if (isEdit) {
        await api.patch(`/admin/customers/${id}`, payload);
      } else {
        await api.post('/admin/customers', payload);
      }
      navigate('/customers');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to save customer. Please check the details and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && isLoading) {
    return <div className="text-gray-500 p-8">Loading customer...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/customers')}>
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <UserPlus className="text-blue-600" /> {isEdit ? 'Edit Customer' : 'Add New Customer'}
          </h2>
          {isEdit && customerDetail?.code && (
            <p className="text-gray-500 mt-1">Customer ID: <span className="font-mono text-blue-600">{customerDetail.code}</span></p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 border-t border-gray-100 pt-4">
            <Field label="Full Name" required>
              <Input value={form.name} onChange={set('name')} placeholder="e.g. Manoj Patil" required />
            </Field>
            <Field label="Mobile No." required>
              <Input value={form.phone} onChange={set('phone')} placeholder="10-digit mobile number" required />
            </Field>
            <Field label="Alternate Mobile">
              <Input value={form.alternatePhone} onChange={set('alternatePhone')} />
            </Field>
            <Field label="Email ID">
              <Input type="email" value={form.email} onChange={set('email')} />
            </Field>
            <Field label="Date of Birth">
              <Input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
            </Field>
            <Field label="Customer Type">
              <Select value={form.customerType} onChange={set('customerType')}>
                <option value="prepaid">Prepaid</option>
                <option value="postpaid">Postpaid</option>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Address Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 border-t border-gray-100 pt-4">
            <Field label="Residence Type">
              <Select value={form.residenceType} onChange={set('residenceType')}>
                <option value="">Select</option>
                <option value="Flat">Flat</option>
                <option value="Bungalow">Bungalow</option>
                <option value="Row House">Row House</option>
              </Select>
            </Field>
            <Field label="Flat No">
              <Input value={form.flatNo} onChange={set('flatNo')} />
            </Field>
            <Field label="Street / Road">
              <Input value={form.streetName} onChange={set('streetName')} />
            </Field>
            <Field label="Society / Colony / Block">
              <Input value={form.societyName} onChange={set('societyName')} />
            </Field>
            <Field label="Nearest Landmark">
              <Input value={form.landmark} onChange={set('landmark')} />
            </Field>
            <Field label="Area">
              <Input value={form.area} onChange={set('area')} />
            </Field>
            <Field label="State">
              <Input value={form.state} onChange={set('state')} />
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={set('city')} placeholder="e.g. Pune" />
            </Field>
            <Field label="Pincode">
              <Input value={form.pincode} onChange={set('pincode')} maxLength={6} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Delivery Assignment</CardTitle>
            <CardDescription>Assign this customer to a hub, route and delivery boy.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-gray-100 pt-4">
            <Field label="Hub">
              <Select value={form.hubId} onChange={set('hubId')}>
                <option value="">No Hub</option>
                {hubs.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </Select>
            </Field>
            <Field label="Route">
              <Select value={form.routeId} onChange={set('routeId')}>
                <option value="">No Route</option>
                {routes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </Field>
            <Field label="Delivery Boy">
              <Select value={form.deliveryBoyId} onChange={set('deliveryBoyId')}>
                <option value="">Not Assigned</option>
                {deliveryBoys.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
            <Field label="Delivery Mode">
              <Select value={form.deliveryMode} onChange={set('deliveryMode')}>
                {deliveryModes.length === 0 && <option value={form.deliveryMode}>{form.deliveryMode}</option>}
                {deliveryModes.map((m: any) => <option key={m.id} value={m.name}>{m.name}</option>)}
              </Select>
            </Field>

            {isEdit && form.deliveryBoyId !== initialDeliveryBoyId && (
              <div className="sm:col-span-2 lg:col-span-4">
                <Field label="Delivery Boy Change Narration">
                  <div className="flex items-start gap-2">
                    <History size={16} className="text-yellow-400 mt-2.5 shrink-0" />
                    <textarea
                      className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      rows={2}
                      value={form.deliveryBoyChangeNarration}
                      onChange={set('deliveryBoyChangeNarration')}
                      placeholder="Reason for reassignment (optional, recorded in history)"
                    />
                  </div>
                </Field>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status</CardTitle>
          </CardHeader>
          <CardContent className="border-t border-gray-100 pt-4">
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="radio" checked={form.status === true} onChange={() => setForm((f) => ({ ...f, status: true }))} />
                Activated
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="radio" checked={form.status === false} onChange={() => setForm((f) => ({ ...f, status: false }))} />
                Deactivated
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="gap-2">
            <Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Update Customer' : 'Register'}
          </Button>
          <Button type="button" variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw size={16} /> Reset
          </Button>
        </div>
      </form>
    </div>
  );
}
