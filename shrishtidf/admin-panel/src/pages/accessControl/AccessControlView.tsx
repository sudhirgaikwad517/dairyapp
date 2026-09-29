import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ShieldCheck, ArrowLeft, Pencil, ChevronDown, Check, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';

const COLUMNS = [
  { key: 'canCreate', label: 'Create' },
  { key: 'canUpdate', label: 'Update' },
  { key: 'canView', label: 'View' },
  { key: 'canPdf', label: 'PDF' },
  { key: 'canExcel', label: 'Excel' }
] as const;

export default function AccessControlView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const { data: detail, isLoading } = useQuery({
    queryKey: ['accessControlDetail', id],
    queryFn: async () => (await api.get(`/admin/access-control/${id}`)).data.data
  });

  if (isLoading || !detail) return <div className="text-gray-500 p-8">Loading...</div>;

  const totalModules = detail.sections.reduce((acc: number, s: any) => acc + s.modules.length, 0);
  const granted = detail.sections.reduce(
    (acc: number, s: any) => acc + s.modules.filter((m: any) => COLUMNS.some((c) => m[c.key])).length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/user-access-control')}><ArrowLeft size={16} /></Button>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <ShieldCheck className="text-blue-600" /> Access Control Detail
        </h2>
        <Button className="gap-2 ml-auto" onClick={() => navigate(`/user-access-control/${id}/edit`)}><Pencil size={16} /> Edit</Button>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-medium text-gray-900">{detail.userName}</p>
            <p className="text-sm text-gray-500 uppercase">{detail.userTypeName}</p>
          </div>
          <Badge variant={granted > 0 ? 'success' : 'outline'}>{granted} / {totalModules} modules configured</Badge>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {detail.sections.map((section: any) => {
          const open = !!openSections[section.key];
          const sectionGranted = section.modules.filter((m: any) => COLUMNS.some((c) => m[c.key])).length;
          return (
            <Card key={section.key} className="overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenSections((s) => ({ ...s, [section.key]: !s[section.key] }))}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <span className="font-semibold text-gray-800">{section.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{sectionGranted}/{section.modules.length} configured</span>
                  <ChevronDown size={16} className={cn('text-gray-400 transition-transform', open && 'rotate-180')} />
                </div>
              </button>
              {open && (
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-500">
                        <th className="text-left font-medium px-4 py-2">Module</th>
                        {COLUMNS.map((c) => <th key={c.key} className="px-3 py-2 text-center font-medium">{c.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {section.modules.map((m: any) => (
                        <tr key={m.key} className="border-b border-gray-50 last:border-0">
                          <td className="px-4 py-2 text-gray-800">{m.label}</td>
                          {COLUMNS.map((c) => (
                            <td key={c.key} className="px-3 py-2 text-center">
                              {m[c.key] ? <Check size={16} className="mx-auto text-emerald-600" /> : <X size={14} className="mx-auto text-gray-300" />}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
