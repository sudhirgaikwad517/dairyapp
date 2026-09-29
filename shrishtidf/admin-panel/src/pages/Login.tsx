import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Lock, Mail, User, ShieldCheck, Users } from 'lucide-react';
import { cn } from '../lib/utils';

type LoginMode = 'admin' | 'staff';

export default function Login() {
  const [mode, setMode] = useState<LoginMode>('admin');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const adminUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5555/api/v1';
    return apiUrl.replace('/api/v1', '/api/admin');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const endpoint = mode === 'admin' ? '/login' : '/staff-login';
      const payload = mode === 'admin' ? { email, password } : { username, password };
      const response = await axios.post(`${adminUrl()}${endpoint}`, payload);

      if (response.data.success) {
        localStorage.setItem('admin_token', response.data.token);
        navigate('/dashboard');
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 relative overflow-hidden">
      {/* Soft background accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/40 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-200/40 rounded-full blur-[120px]" />

      <Card className="w-full max-w-md relative z-10 border-gray-200 bg-white shadow-lg">
        <form onSubmit={handleLogin}>
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-2 border border-blue-100">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-gray-900">Admin Portal</CardTitle>
            <CardDescription className="text-gray-500">
              Sign in to manage Shrishti Dairy operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => setMode('admin')}
                className={cn(
                  'flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors',
                  mode === 'admin' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <ShieldCheck size={16} /> Super Admin
              </button>
              <button
                type="button"
                onClick={() => setMode('staff')}
                className={cn(
                  'flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors',
                  mode === 'staff' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <Users size={16} /> Employee
              </button>
            </div>

            {mode === 'admin' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="admin@shrishtidairy.com"
                    className="pl-10 focus-visible:ring-blue-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="e.g. sagarc"
                    className="pl-10 focus-visible:ring-blue-500"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Password</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 focus-visible:ring-blue-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-4 pb-6">
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-all"
              disabled={isLoading}
            >
              {isLoading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
