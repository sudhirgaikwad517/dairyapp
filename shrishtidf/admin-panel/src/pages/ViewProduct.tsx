import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Package, ArrowLeft, Edit } from 'lucide-react';
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

export default function ViewProduct() {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: p, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => (await api.get(`/admin/products/${id}`)).data.data
  });

  if (isLoading) {
    return <div className="text-gray-500 p-8">Loading product...</div>;
  }
  if (!p) {
    return <div className="text-gray-500 p-8">Product not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/products')}>
            <ArrowLeft size={16} />
          </Button>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Package className="text-blue-600" /> Product Details
          </h2>
        </div>
        <Button className="gap-2" onClick={() => navigate(`/products/${id}`)}>
          <Edit size={16} /> Edit
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{p.name}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2 border-t border-gray-100 pt-4">
          <Field label="Category">{p.product_categories?.label}</Field>
          <Field label="Sub Category">{p.product_sub_categories?.label}</Field>
          <Field label="Product Type">{p.product_type}</Field>
          <Field label="Product Shortcode">{p.short_code}</Field>
          <Field label="Discount (Rs)">₹{p.discount}</Field>
          <Field label="GST (%)">{Number(p.gst_rate || 0)}%</Field>
          <Field label="HSN Code">{p.hsn_code}</Field>
          <Field label="Status"><Badge variant={p.is_active ? 'success' : 'outline'}>{p.is_active ? 'Active' : 'Inactive'}</Badge></Field>
          <div className="sm:col-span-2">
            <Field label="Description">{p.description}</Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Customer Eligibility</CardTitle></CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2 border-t border-gray-100 pt-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Prepaid Customer</p>
            <div className="flex gap-2">
              <Badge variant={p.prepaid_getonce ? 'success' : 'outline'}>One Time {p.prepaid_getonce ? 'Yes' : 'No'}</Badge>
              <Badge variant={p.prepaid_subscribe ? 'success' : 'outline'}>Subscribe {p.prepaid_subscribe ? 'Yes' : 'No'}</Badge>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Postpaid Customer</p>
            <div className="flex gap-2">
              <Badge variant={p.postpaid_getonce ? 'success' : 'outline'}>One Time {p.postpaid_getonce ? 'Yes' : 'No'}</Badge>
              <Badge variant={p.postpaid_subscribe ? 'success' : 'outline'}>Subscribe {p.postpaid_subscribe ? 'Yes' : 'No'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Images</CardTitle></CardHeader>
        <CardContent className="border-t border-gray-100 pt-4">
          <div className="flex flex-wrap gap-4">
            {p.image_url && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Main Image</p>
                <img src={p.image_url} alt={p.name} className="w-28 h-28 object-cover rounded-lg border border-gray-200" />
              </div>
            )}
            {(p.product_images || []).map((img: any) => (
              <div key={img.id}>
                <img src={img.image_url} alt="Gallery" className="w-28 h-28 object-cover rounded-lg border border-gray-200" />
              </div>
            ))}
            {!p.image_url && (p.product_images || []).length === 0 && (
              <p className="text-sm text-gray-500">No images added.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Product Details by City</CardTitle></CardHeader>
        <CardContent className="border-t border-gray-100 pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>City</TableHead>
                <TableHead>Packaging</TableHead>
                <TableHead className="text-right">Ltrs</TableHead>
                <TableHead className="text-right">Packets</TableHead>
                <TableHead className="text-right">Rate (SP)</TableHead>
                <TableHead className="text-right">MRP (Ecom)</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Bottle / Pouch</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(p.product_variants || []).map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium text-gray-900">{v.city || '—'}</TableCell>
                  <TableCell className="text-gray-700">{v.size_label}</TableCell>
                  <TableCell className="text-right text-gray-700">{v.ltrs ?? '—'}</TableCell>
                  <TableCell className="text-right text-gray-700">{v.packets}</TableCell>
                  <TableCell className="text-right text-gray-800 font-medium">₹{v.buy_once}</TableCell>
                  <TableCell className="text-right text-gray-800 font-medium">₹{v.mrp_ecom}</TableCell>
                  <TableCell className="text-right text-gray-700">{v.stock_quantity}</TableCell>
                  <TableCell className="text-gray-600">
                    {v.bottle_applicable ? 'Bottle' : ''}{v.bottle_applicable && v.pouch_applicable ? ', ' : ''}{v.pouch_applicable ? 'Pouch' : ''}{!v.bottle_applicable && !v.pouch_applicable ? '—' : ''}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {v.web_visibility ? 'Web' : ''}{v.web_visibility && v.app_visibility ? ', ' : ''}{v.app_visibility ? 'App' : ''}
                  </TableCell>
                  <TableCell>
                    {v.out_of_stock || v.stock_quantity <= 0 ? <Badge variant="destructive">Out of Stock</Badge> : <Badge variant="success">In Stock</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
