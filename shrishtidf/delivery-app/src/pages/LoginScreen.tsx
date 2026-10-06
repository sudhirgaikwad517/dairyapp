import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Milk } from 'lucide-react';
import { api } from '../lib/api';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/delivery-boy/login', { phone, password });
      if (res.data.success) {
        localStorage.setItem('delivery_token', res.data.data.token);
        localStorage.setItem('delivery_user', JSON.stringify(res.data.data.deliveryBoy));
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
            <Milk className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Partner App</h1>
          <p className="text-slate-500 text-sm mt-1">Shrishti Dairy Farm</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number / Username</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              placeholder="Enter your phone or username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-medium rounded-xl py-3.5 mt-2 active:scale-[0.98] transition-transform disabled:opacity-70 disabled:active:scale-100"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
