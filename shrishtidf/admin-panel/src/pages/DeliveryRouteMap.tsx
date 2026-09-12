import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Map as MapIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const PUNE_CENTER: [number, number] = [18.5204, 73.8567];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function numberedIcon(n: number) {
  return L.divIcon({
    className: '',
    html: `<div style="background:#2563eb;color:#fff;border-radius:9999px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)">${n}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
}

export default function DeliveryRouteMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layerGroup = useRef<L.LayerGroup | null>(null);

  const [deliveryBoyId, setDeliveryBoyId] = useState('');

  const { data: deliveryBoys = [] } = useQuery({ queryKey: ['deliveryBoysLite'], queryFn: async () => (await api.get('/admin/delivery-boys')).data.data });

  const { data, isLoading } = useQuery({
    queryKey: ['routeMapCustomers', deliveryBoyId],
    queryFn: async () => {
      const res = await api.get('/admin/customers', { params: { deliveryBoyId, page: '1', pageSize: '500', status: 'active' } });
      return res.data.data.rows;
    },
    enabled: !!deliveryBoyId
  });

  const customers = [...(data || [])].sort((a: any, b: any) => (a.deliverySequence || 0) - (b.deliverySequence || 0));

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current).setView(PUNE_CENTER, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    layerGroup.current = L.layerGroup().addTo(map);
    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    const group = layerGroup.current;
    if (!map || !group) return;
    group.clearLayers();

    const withLocation = customers.filter((c: any) => c.latitude !== null && c.longitude !== null);
    if (withLocation.length === 0) {
      map.setView(PUNE_CENTER, 12);
      return;
    }

    const points: [number, number][] = withLocation.map((c: any) => [c.latitude, c.longitude]);
    withLocation.forEach((c: any, idx: number) => {
      L.marker([c.latitude, c.longitude], { icon: numberedIcon(idx + 1) })
        .bindPopup(`<strong>${c.name || 'Unnamed'}</strong><br/>${c.address || ''}`)
        .addTo(group);
    });
    if (points.length > 1) {
      L.polyline(points, { color: '#2563eb', weight: 3, opacity: 0.7 }).addTo(group);
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  }, [customers]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <MapIcon className="text-blue-600" /> Delivery Route Map
        </h2>
        <p className="text-gray-500 mt-1">Visualize a delivery boy's assigned stops in sequence order.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="max-w-xs">
            <Field label="Delivery Boy">
              <Select value={deliveryBoyId} onChange={(e) => setDeliveryBoyId(e.target.value)}>
                <option value="">Select Delivery Boy</option>
                {deliveryBoys.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assigned Customers</CardTitle>
            <CardDescription>{isLoading ? 'Loading...' : deliveryBoyId ? `${customers.length} customers` : 'Select a delivery boy'}</CardDescription>
          </CardHeader>
          <CardContent className="border-t border-gray-100 pt-4 max-h-[520px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Sr.no</TableHead>
                  <TableHead>Customer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c: any, idx: number) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-gray-500">{idx + 1}</TableCell>
                    <TableCell>
                      <span className="font-medium text-gray-900 block">{c.name || 'Unnamed'}</span>
                      {c.latitude === null && <span className="text-xs text-amber-600">No location marked</span>}
                    </TableCell>
                  </TableRow>
                ))}
                {deliveryBoyId && customers.length === 0 && !isLoading && (
                  <TableRow><TableCell colSpan={2} className="text-center py-6 text-gray-500">No customers assigned.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Service Route</CardTitle></CardHeader>
          <CardContent className="border-t border-gray-100 pt-4">
            <div ref={mapRef} className="w-full h-[520px] rounded-lg border border-gray-200" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
