import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LocateFixed, Search, Save } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Vite rewrites these to hashed asset URLs; Leaflet's default icon otherwise looks for them
// relative to the page and renders as broken images.
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

export default function MarkCustomerLocation() {
  const queryClient = useQueryClient();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerInstance = useRef<L.Marker | null>(null);

  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: options = [] } = useQuery({
    queryKey: ['customerSearch', searchTerm],
    queryFn: async () => {
      if (!searchTerm) return [];
      const res = await api.get('/admin/customers', { params: { name: searchTerm, page: '1', pageSize: '20' } });
      return res.data.data.rows;
    },
    enabled: !!searchTerm
  });

  const { data: customer } = useQuery({
    queryKey: ['customerLocation', customerId],
    queryFn: async () => (await api.get(`/admin/customers/${customerId}`)).data.data,
    enabled: !!customerId
  });

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current).setView(PUNE_CENTER, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => {
      setPosition([e.latlng.lat, e.latlng.lng]);
      setSaved(false);
    });
    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  useEffect(() => {
    if (customer) {
      const lat = customer.latitude !== null && customer.latitude !== undefined ? Number(customer.latitude) : null;
      const lng = customer.longitude !== null && customer.longitude !== undefined ? Number(customer.longitude) : null;
      const pos: [number, number] = lat !== null && lng !== null ? [lat, lng] : PUNE_CENTER;
      setPosition(lat !== null && lng !== null ? pos : null);
      setSaved(false);
      mapInstance.current?.setView(pos, lat !== null ? 16 : 12);
    }
  }, [customer]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (!position) {
      markerInstance.current?.remove();
      markerInstance.current = null;
      return;
    }
    if (!markerInstance.current) {
      markerInstance.current = L.marker(position, { draggable: true }).addTo(map);
      markerInstance.current.on('dragend', () => {
        const p = markerInstance.current!.getLatLng();
        setPosition([p.lat, p.lng]);
        setSaved(false);
      });
    } else {
      markerInstance.current.setLatLng(position);
    }
  }, [position]);

  const handleSave = async () => {
    if (!customerId || !position) return;
    setSaving(true);
    try {
      await api.patch(`/admin/customers/${customerId}`, { latitude: position[0], longitude: position[1] });
      await queryClient.invalidateQueries({ queryKey: ['customerLocation', customerId] });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <LocateFixed className="text-blue-600" /> Mark Customer Location
        </h2>
        <p className="text-gray-500 mt-1">Pin a customer's exact delivery location for the Delivery Route Map.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-lg">Customer Information</CardTitle></CardHeader>
          <CardContent className="space-y-4 border-t border-gray-100 pt-4">
            <Field label="Search Customer">
              <div className="flex gap-2">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or mobile" onKeyDown={(e) => e.key === 'Enter' && setSearchTerm(search)} />
                <Button variant="outline" size="icon" onClick={() => setSearchTerm(search)}><Search size={16} /></Button>
              </div>
            </Field>
            {options.length > 0 && (
              <div className="border border-gray-200 rounded-lg divide-y max-h-64 overflow-y-auto">
                {options.map((c: any) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${customerId === c.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setCustomerId(c.id)}
                  >
                    <span className="font-medium text-gray-900 block">{c.name || 'Unnamed'}</span>
                    <span className="text-xs text-gray-500">{c.phone} · {c.address || 'No address'}</span>
                  </button>
                ))}
              </div>
            )}
            {customer && (
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm">
                <p className="font-medium text-gray-900">{customer.name}</p>
                <p className="text-gray-500">{customer.phone}</p>
                <p className="text-gray-500 mt-1">{customer.address || 'No address on file'}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {position ? `Lat ${position[0].toFixed(6)}, Lng ${position[1].toFixed(6)}` : 'No location marked yet — click the map to set one.'}
                </p>
              </div>
            )}
            <Button onClick={handleSave} disabled={!customerId || !position || saving} className="gap-2 w-full">
              <Save size={16} /> {saving ? 'Saving...' : saved ? 'Saved' : 'Save Location'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mark Location</CardTitle>
            <CardDescription>Click anywhere on the map, or drag the marker, to set the customer's location.</CardDescription>
          </CardHeader>
          <CardContent className="border-t border-gray-100 pt-4">
            <div ref={mapRef} className="w-full h-[520px] rounded-lg border border-gray-200" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
