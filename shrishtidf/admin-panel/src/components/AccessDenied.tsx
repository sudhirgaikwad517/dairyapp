import { ShieldAlert } from 'lucide-react';

export default function AccessDenied() {
  return (
    <div className="h-full flex items-center justify-center py-24">
      <div className="text-center max-w-sm">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-4">
          <ShieldAlert className="text-red-500" size={28} />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-gray-500 mt-2 text-sm">
          You don't have permission to view this page. Contact your admin if you think this is a mistake.
        </p>
      </div>
    </div>
  );
}
