import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import CustomerPicker from '../components/CustomerPicker';
import ProductCatalogBrowser from '../components/ProductCatalogBrowser';

export default function Subscribe() {
  const navigate = useNavigate();
  const { customerId } = useParams();

  if (customerId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/subscriptions/subscribe')}><ArrowLeft size={16} /></Button>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <RefreshCw className="text-blue-600" /> Subscribe
          </h2>
        </div>
        <ProductCatalogBrowser customerId={customerId} mode="subscribe" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
        <RefreshCw className="text-blue-600" /> Subscribe
      </h2>
      <Card>
        <CardHeader><CardTitle className="text-lg">Select Customer</CardTitle></CardHeader>
        <CardContent className="border-t border-gray-100 pt-4">
          <CustomerPicker onSelect={(c) => navigate(`/subscriptions/subscribe/${c.id}`)} />
        </CardContent>
      </Card>
    </div>
  );
}
