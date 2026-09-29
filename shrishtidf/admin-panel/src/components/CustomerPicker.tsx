import { useState } from 'react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function CustomerPicker({ onSelect }: { onSelect: (customer: any) => void }) {
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: options = [], isFetching } = useQuery({
    queryKey: ['customerPickerSearch', searchTerm],
    queryFn: async () => {
      const res = await api.get('/admin/customers', { params: { name: searchTerm, page: '1', pageSize: '20' } });
      return res.data.data.rows;
    },
    enabled: !!searchTerm
  });

  const runSearch = () => setSearchTerm(search.trim());

  return (
    <div className="space-y-3">
      <div className="flex gap-2 max-w-lg">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          placeholder="Search customer by name or mobile..."
        />
        <Button variant="outline" size="icon" onClick={runSearch}><Search size={16} /></Button>
      </div>
      {isFetching && <p className="text-sm text-gray-500">Searching...</p>}
      {!isFetching && searchTerm && options.length === 0 && (
        <p className="text-sm text-gray-500">No customers found for "{searchTerm}".</p>
      )}
      {options.length > 0 && (
        <div className="border border-gray-200 rounded-lg divide-y max-w-lg max-h-72 overflow-y-auto">
          {options.map((c: any) => (
            <button
              key={c.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
              onClick={() => onSelect(c)}
            >
              <span className="font-medium text-gray-900 block">{c.code} - {c.name || 'Unnamed'}</span>
              <span className="text-xs text-gray-500">{c.phone} · {c.city || 'No city'} · <span className="capitalize">{c.customerType}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
