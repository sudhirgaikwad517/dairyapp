import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, PhoneCall, Camera, Check, X, AlertTriangle, MessageSquare } from 'lucide-react';
import { api } from '../lib/api';
import clsx from 'clsx';

export default function DeliveryDetailScreen() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  
  const record = state?.record;

  const [qty, setQty] = useState(record ? Number(record.quantity_ordered) : 0);
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Note: Photo upload logic would integrate with device camera or file input. 
  // We'll keep it as a UI placeholder for now.
  const [leakPhoto] = useState<string | null>(null);
  const [deliveryPhoto] = useState<string | null>(null);

  if (!record) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center">
        <p>Record not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600">Go Back</button>
      </div>
    );
  }

  const isPending = record.status === 'pending';

  const handleMark = async (status: 'delivered' | 'skipped' | 'damaged') => {
    try {
      setLoading(true);
      await api.patch(`/delivery-boy/run/${id}/mark`, {
        status,
        quantityDelivered: qty,
        remark,
        leakPhotoUrl: leakPhoto,
        deliveryPhotoUrl: deliveryPhoto
      });
      // Navigate back on success
      navigate(-1);
    } catch (error) {
      console.error(error);
      alert('Failed to update delivery');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center active:bg-slate-100">
          <ArrowLeft className="w-6 h-6 text-slate-700" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 flex-1">Delivery Details</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        {/* Customer Info Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{record.customers.name}</h2>
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {record.customers.flat_no}, {record.customers.society_name}
              </p>
            </div>
            <a href={`tel:${record.customers.phone}`} className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
              <PhoneCall className="w-5 h-5" />
            </a>
          </div>
          
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={record.products.image_url || '/placeholder.png'} className="w-12 h-12 rounded-lg object-cover border border-slate-200 bg-white" />
              <div>
                <p className="font-medium text-slate-900">{record.products.name}</p>
                <p className="text-xs text-slate-500">Ordered Qty: {Number(record.quantity_ordered)} L</p>
              </div>
            </div>
          </div>
        </div>

        {isPending ? (
          <>
            {/* Delivery Form */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-4">Update Delivery</h3>
              
              {/* Quantity */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Delivered Quantity (L)</label>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setQty(Math.max(0, qty - 0.5))}
                    className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-xl font-bold active:bg-slate-200"
                  >-</button>
                  <div className="flex-1 text-center text-2xl font-bold text-slate-900">{qty}</div>
                  <button 
                    onClick={() => setQty(qty + 0.5)}
                    className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-xl font-bold active:bg-slate-200"
                  >+</button>
                </div>
                {qty < Number(record.quantity_ordered) && (
                  <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Quantity is less than ordered. Wallet will be adjusted.
                  </p>
                )}
              </div>

              {/* Photos */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-4 text-slate-500 active:bg-slate-50">
                  <Camera className="w-6 h-6" />
                  <span className="text-xs font-medium">Delivery Proof</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-4 text-slate-500 active:bg-slate-50">
                  <AlertTriangle className="w-6 h-6" />
                  <span className="text-xs font-medium">Leak/Damage</span>
                </button>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Delivery Note (Optional)</label>
                <div className="relative">
                  <MessageSquare className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                  <textarea 
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="e.g. Left with watchman"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none h-24"
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-center py-10">
            <div className={clsx(
              "w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center",
              record.status === 'delivered' ? "bg-green-100 text-green-600" :
              record.status === 'skipped' ? "bg-orange-100 text-orange-600" :
              "bg-red-100 text-red-600"
            )}>
              {record.status === 'delivered' ? <Check className="w-8 h-8" /> : <X className="w-8 h-8" />}
            </div>
            <h3 className="font-bold text-lg text-slate-900">Marked as {record.status.toUpperCase()}</h3>
            <p className="text-slate-500 mt-1">Delivered: {Number(record.quantity_delivered)} L</p>
            {record.remark && <p className="text-sm text-slate-600 mt-3 bg-slate-50 p-3 rounded-xl">Note: {record.remark}</p>}
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      {isPending && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 shadow-[0_-10px_20px_rgb(0,0,0,0.03)] grid grid-cols-3 gap-2 z-20">
          <button 
            disabled={loading}
            onClick={() => handleMark('skipped')}
            className="col-span-1 bg-slate-100 text-slate-700 font-medium rounded-xl py-3.5 flex items-center justify-center gap-1 active:bg-slate-200"
          >
            Skip
          </button>
          <button 
            disabled={loading}
            onClick={() => handleMark('delivered')}
            className="col-span-2 bg-blue-600 text-white font-medium rounded-xl py-3.5 flex items-center justify-center gap-2 active:bg-blue-700 shadow-lg shadow-blue-500/30"
          >
            {loading ? 'Saving...' : 'Mark Delivered'}
          </button>
        </div>
      )}
    </div>
  );
}
