import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { ShieldCheck, ArrowLeft, Save, RotateCcw, ChevronDown, CheckSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';

type Perm = { canCreate: boolean; canUpdate: boolean; canView: boolean; canPdf: boolean; canExcel: boolean };
const EMPTY_PERM: Perm = { canCreate: false, canUpdate: false, canView: false, canPdf: false, canExcel: false };
const COLUMNS: { key: keyof Perm; label: string }[] = [
  { key: 'canCreate', label: 'Create' },
  { key: 'canUpdate', label: 'Update' },
  { key: 'canView', label: 'View' },
  { key: 'canPdf', label: 'PDF' },
  { key: 'canExcel', label: 'Excel' }
];

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}{required && <span className="text-red-600 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

export default function AccessControlForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [staffTypeId, setStaffTypeId] = useState('');
  const [officeStaffId, setOfficeStaffId] = useState('');
  const [lockedUserName, setLockedUserName] = useState('');
  const [lockedUserTypeName, setLockedUserTypeName] = useState('');
  const [permissions, setPermissions] = useState<Record<string, Perm>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: catalog = [] } = useQuery({
    queryKey: ['accessControlCatalog'],
    queryFn: async () => (await api.get('/admin/access-control/catalog')).data.data
  });

  const { data: staffTypes = [] } = useQuery({
    queryKey: ['staffTypesActive'],
    queryFn: async () => (await api.get('/admin/staff-types', { params: { status: 'active' } })).data.data,
    enabled: !isEdit
  });

  const { data: eligibleStaff = [] } = useQuery({
    queryKey: ['accessControlEligibleStaff'],
    queryFn: async () => (await api.get('/admin/access-control/eligible-staff', { params: { excludeAssigned: 'true' } })).data.data,
    enabled: !isEdit
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['accessControlDetail', id],
    queryFn: async () => (await api.get(`/admin/access-control/${id}`)).data.data,
    enabled: isEdit
  });

  useEffect(() => {
    if (detail) {
      setStaffTypeId(detail.staffTypeId);
      setOfficeStaffId(detail.officeStaffId);
      setLockedUserName(detail.userName);
      setLockedUserTypeName(detail.userTypeName);
      const initial: Record<string, Perm> = {};
      detail.sections.forEach((s: any) => {
        s.modules.forEach((m: any) => {
          initial[m.key] = { canCreate: m.canCreate, canUpdate: m.canUpdate, canView: m.canView, canPdf: m.canPdf, canExcel: m.canExcel };
        });
      });
      setPermissions(initial);
      const openState: Record<string, boolean> = {};
      detail.sections.forEach((s: any, idx: number) => { openState[s.key] = idx === 0; });
      setOpenSections(openState);
    }
  }, [detail]);

  useEffect(() => {
    if (!isEdit && catalog.length && Object.keys(openSections).length === 0) {
      const openState: Record<string, boolean> = {};
      catalog.forEach((s: any, idx: number) => { openState[s.key] = idx === 0; });
      setOpenSections(openState);
    }
  }, [catalog, isEdit, openSections]);

  const staffOfSelectedType = useMemo(
    () => eligibleStaff.filter((s: any) => !staffTypeId || s.staffTypeId === staffTypeId),
    [eligibleStaff, staffTypeId]
  );

  const getPerm = (moduleKey: string) => permissions[moduleKey] || EMPTY_PERM;

  const toggleModule = (moduleKey: string, col: keyof Perm) => {
    setPermissions((prev) => ({ ...prev, [moduleKey]: { ...getPerm(moduleKey), [col]: !getPerm(moduleKey)[col] } }));
  };

  const toggleSectionColumn = (section: any, col: keyof Perm) => {
    const allChecked = section.modules.every((m: any) => getPerm(m.key)[col]);
    setPermissions((prev) => {
      const next = { ...prev };
      section.modules.forEach((m: any) => { next[m.key] = { ...getPerm(m.key), [col]: !allChecked }; });
      return next;
    });
  };

  const grantAllInSection = (section: any) => {
    setPermissions((prev) => {
      const next = { ...prev };
      section.modules.forEach((m: any) => { next[m.key] = { canCreate: true, canUpdate: true, canView: true, canPdf: true, canExcel: true }; });
      return next;
    });
  };

  const modulesGranted = Object.values(permissions).filter((p) => p.canCreate || p.canUpdate || p.canView || p.canPdf || p.canExcel).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isEdit && (!staffTypeId || !officeStaffId)) {
      setError('User Type and User are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        staffTypeId,
        officeStaffId,
        permissions: Object.entries(permissions).map(([moduleKey, p]) => ({ moduleKey, ...p }))
      };
      if (isEdit) await api.patch(`/admin/access-control/${id}`, payload);
      else await api.post('/admin/access-control', payload);
      navigate('/user-access-control');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to save access control.');
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && detailLoading) return <div className="text-gray-500 p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/user-access-control')}><ArrowLeft size={16} /></Button>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <ShieldCheck className="text-blue-600" /> {isEdit ? 'Edit Access Control' : 'Add New Access Control'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}

        <Card>
          <CardContent className="grid gap-4 sm:grid-cols-2 pt-6">
            <Field label="User Type" required>
              {isEdit ? (
                <p className="h-10 flex items-center text-sm font-medium text-gray-900">{lockedUserTypeName || '—'}</p>
              ) : (
                <Select value={staffTypeId} onChange={(e) => { setStaffTypeId(e.target.value); setOfficeStaffId(''); }} required>
                  <option value="">Select Type</option>
                  {staffTypes.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              )}
            </Field>
            <Field label="User" required>
              {isEdit ? (
                <p className="h-10 flex items-center text-sm font-medium text-gray-900">{lockedUserName || '—'}</p>
              ) : (
                <Select value={officeStaffId} onChange={(e) => setOfficeStaffId(e.target.value)} required disabled={!staffTypeId}>
                  <option value="">Select User</option>
                  {staffOfSelectedType.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              )}
            </Field>
          </CardContent>
        </Card>

        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 font-medium">
          {modulesGranted} of {catalog.reduce((acc: number, s: any) => acc + s.modules.length, 0)} modules have at least one permission granted.
        </div>

        <div className="space-y-3">
          {catalog.map((section: any) => {
            const open = !!openSections[section.key];
            return (
              <Card key={section.key} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenSections((s) => ({ ...s, [section.key]: !s[section.key] }))}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="font-semibold text-gray-800">{section.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">
                      {section.modules.filter((m: any) => Object.values(getPerm(m.key)).some(Boolean)).length}/{section.modules.length} configured
                    </span>
                    <ChevronDown size={16} className={cn('text-gray-400 transition-transform', open && 'rotate-180')} />
                  </div>
                </button>

                {open && (
                  <CardContent className="p-0">
                    <div className="flex justify-end px-4 pt-3">
                      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => grantAllInSection(section)}>
                        <CheckSquare size={14} /> Grant All in Section
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 text-gray-500">
                            <th className="text-left font-medium px-4 py-2 w-10">Sr.No.</th>
                            <th className="text-left font-medium px-4 py-2">Module</th>
                            {COLUMNS.map((c) => (
                              <th key={c.key} className="px-3 py-2 text-center font-medium">
                                <button type="button" className="flex flex-col items-center gap-1 mx-auto hover:text-blue-600" onClick={() => toggleSectionColumn(section, c.key)}>
                                  {c.label}
                                  <input type="checkbox" readOnly checked={section.modules.every((m: any) => getPerm(m.key)[c.key])} className="cursor-pointer" />
                                </button>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {section.modules.map((m: any, idx: number) => (
                            <tr key={m.key} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                              <td className="px-4 py-2 text-gray-400">{idx + 1}</td>
                              <td className="px-4 py-2 text-gray-800">{m.label}</td>
                              {COLUMNS.map((c) => (
                                <td key={c.key} className="px-3 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    className="cursor-pointer w-4 h-4 accent-blue-600"
                                    checked={getPerm(m.key)[c.key]}
                                    onChange={() => toggleModule(m.key, c.key)}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        <div className="flex gap-3 sticky bottom-0 bg-gray-50/80 backdrop-blur py-3 -mx-1 px-1">
          <Button type="submit" disabled={saving} className="gap-2"><Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create'}</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/user-access-control')} className="gap-2"><RotateCcw size={16} /> Cancel</Button>
        </div>
      </form>
    </div>
  );
}
