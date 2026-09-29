import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FileText, Plus, Edit } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function ContentPages() {
  const navigate = useNavigate();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['contentPages'],
    queryFn: async () => (await api.get('/admin/content-pages')).data.data
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <FileText className="text-blue-600" /> About Us &amp; Policies
          </h2>
          <p className="text-gray-500 mt-1">Content shown on the app's About Us and Policies screens.</p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/content-pages/new')}>
          <Plus size={16} /> Add New Page
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Pages</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : `Displaying ${rows.length} pages`}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p: any) => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/content-pages/${p.id}`)}>
                  <TableCell className="font-medium text-gray-900">{p.title}</TableCell>
                  <TableCell className="text-gray-500 font-mono text-xs">{p.slug}</TableCell>
                  <TableCell>{p.isActive ? <Badge variant="success">Activated</Badge> : <Badge variant="outline">Deactivated</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={(e) => { e.stopPropagation(); navigate(`/content-pages/${p.id}`); }}>
                      <Edit size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={4} className="text-center py-6 text-gray-500">No pages found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
