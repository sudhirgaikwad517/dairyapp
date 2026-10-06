import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../lib/api';
import clsx from 'clsx';

type DeliveryRecord = {
  id: string;
  customers: {
    id: string;
    name: string;
    phone: string;
    address: string;
    flat_no: string;
    society_name: string;
    landmark: string;
    delivery_sequence: number;
  };
  products: {
    id: string;
    name: string;
    image_url: string;
  };
  quantity_ordered: number;
  status: 'pending' | 'delivered' | 'skipped' | 'damaged';
};

export default function DashboardScreen() {
  const [records, setRecords] = useState<DeliveryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('delivery_user') || '{}');

  useEffect(() => {
    fetchRun();
  }, []);

  const fetchRun = async () => {
    try {
      const res = await api.get('/delivery-boy/run');
      setRecords(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.post('/delivery-boy/logout').finally(() => {
      localStorage.removeItem('delivery_token');
      localStorage.removeItem('delivery_user');
      navigate('/login');
    });
  };

  const total = records.length;
  const completed = records.filter(r => r.status !== 'pending').length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm sticky top-0 z-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Hello, {user?.name?.split(' ')[0]}</h1>
            <p className="text-sm text-slate-500">Today's Route</p>
          </div>
          <button onClick={handleLogout} className="w-10 h-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center active:bg-slate-200">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Card */}
        <div className="bg-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-blue-100 text-sm mb-1">Deliveries Progress</p>
              <div className="text-3xl font-bold">{completed} <span className="text-lg text-blue-200 font-medium">/ {total}</span></div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold">{progress}%</div>
            </div>
          </div>
          <div className="h-2 bg-blue-900/40 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="px-6 py-6 flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p>Loading route...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No Deliveries Today</h3>
            <p className="text-slate-500 mt-1">Enjoy your day off!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((record, index) => {
              const isCompleted = record.status !== 'pending';
              
              return (
                <div 
                  key={record.id}
                  onClick={() => navigate(`/delivery/${record.id}`, { state: { record } })}
                  className={clsx(
                    "bg-white rounded-2xl p-4 shadow-sm border border-slate-100 active:scale-[0.98] transition-transform",
                    isCompleted && "opacity-75"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center mt-1 gap-1">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      {index !== records.length - 1 && (
                        <div className="w-0.5 h-10 bg-slate-100 rounded-full" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-semibold text-slate-900 line-clamp-1">{record.customers.name}</h3>
                        <div className="flex items-center gap-1">
                          {isCompleted ? (
                            <span className={clsx(
                              "text-xs px-2 py-0.5 rounded-md font-medium",
                              record.status === 'delivered' ? "bg-green-100 text-green-700" :
                              record.status === 'skipped' ? "bg-orange-100 text-orange-700" :
                              "bg-red-100 text-red-700"
                            )}>
                              {record.status.toUpperCase()}
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-blue-50 text-blue-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                        {record.customers.flat_no}, {record.customers.society_name}
                      </p>
                      
                      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <img src={record.products.image_url || '/placeholder.png'} className="w-8 h-8 object-cover rounded-md bg-white border border-slate-200" alt="" />
                          <div>
                            <p className="text-xs text-slate-500">Product</p>
                            <p className="text-sm font-medium text-slate-900">{record.products.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Qty</p>
                          <p className="text-sm font-bold text-slate-900">{Number(record.quantity_ordered)} L</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
