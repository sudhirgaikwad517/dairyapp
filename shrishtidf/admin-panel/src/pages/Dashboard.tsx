import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Users, Wallet, TrendingDown, UserCheck, RefreshCw, Droplet, HelpCircle,
  UserPlus, CalendarCheck, PauseCircle, FileEdit, MapPin, X,
  MessageSquare, ShoppingBag, Palmtree, WalletCards
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatDateOnly } from '../lib/utils';

type Zone = 'all' | 'pune' | 'mumbai';

const ALERT_TABS: { key: string; label: string; icon: any }[] = [
  { key: 'customer_registered', label: 'Customer Registered', icon: UserPlus },
  { key: 'feedback', label: 'Feedback', icon: MessageSquare },
  { key: 'enquiry', label: 'Enquiry', icon: HelpCircle },
  { key: 'subscription', label: 'Subscription', icon: RefreshCw },
  { key: 'one_time_order', label: 'One Time Order', icon: ShoppingBag },
  { key: 'holiday', label: 'Holiday', icon: Palmtree },
  { key: 'change_request', label: 'Change Request', icon: FileEdit },
  { key: 'wallet', label: 'Wallet', icon: WalletCards },
];

function currentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: formatDateOnly(from), to: formatDateOnly(to) };
}

function StatCard({ icon: Icon, label, value, tone = 'default' }: { icon: any; label: string; value: React.ReactNode; tone?: 'default' | 'danger' }) {
  return (
    <Card className="relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <CardContent className="pt-6 flex items-center gap-4">
        <div className={`p-3 rounded-lg border ${tone === 'danger' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
          <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [zone, setZone] = useState<Zone>('all');
  const [range, setRange] = useState(currentMonthRange());
  const [activeTab, setActiveTab] = useState(ALERT_TABS[0].key);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboardStats', zone, range.from, range.to],
    queryFn: async () => {
      const res = await api.get('/admin/dashboard', { params: { zone, from: range.from, to: range.to } });
      return res.data.data;
    }
  });

  const dismissAlert = async (id: string) => {
    try {
      await api.patch(`/admin/alerts/${id}/dismiss`);
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    } catch {
      // Non-critical UI action; silently ignore network hiccups.
    }
  };

  const stats = data?.statistics;
  const rupee = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const activeItems = data?.alerts?.items?.[activeTab] || [];
  const activeCount = data?.alerts?.counts?.[activeTab] || 0;

  if (isLoading) {
    return <div className="text-gray-500 p-8">Loading dashboard statistics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h2>
          <p className="text-gray-500 mt-1">Overview of your dairy operations.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-lg p-1">
            {(['all', 'pune', 'mumbai'] as Zone[]).map((z) => (
              <button
                key={z}
                onClick={() => setZone(z)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors flex items-center gap-1.5 ${
                  zone === z ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {z !== 'all' && <MapPin size={14} />}
                {z}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} className="w-[150px]" />
            <span className="text-gray-500 text-sm">to</span>
            <Input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className="w-[150px]" />
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard icon={Users} label="Customers Registered" value={stats?.customersRegistered ?? 0} />
        <StatCard icon={Wallet} label="Total In-Hand Wallet Amount" value={rupee(stats?.totalInHandWallet)} />
        <StatCard icon={TrendingDown} label="Total Negative Wallet Amount" value={rupee(stats?.totalNegativeWallet)} tone="danger" />
        <StatCard icon={UserCheck} label="No. of Active Customers" value={stats?.activeCustomers ?? 0} />
        <StatCard icon={RefreshCw} label="No. of Active Subscriptions" value={stats?.activeSubscriptions ?? 0} />
        <StatCard icon={Droplet} label="Milk Delivered This Month" value={`${stats?.milkDeliveredThisMonth ?? 0} Ltrs`} />
        <StatCard icon={HelpCircle} label="Enquiries This Month" value={stats?.enquiriesThisMonth ?? 0} />
        <StatCard icon={UserPlus} label="Customers Registered This Month" value={stats?.customersRegisteredThisMonth ?? 0} />
        <StatCard icon={CalendarCheck} label="Customers Registered Today" value={stats?.customersRegisteredToday ?? 0} />
      </div>

      {/* Hold / Change requests */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><PauseCircle size={18} className="text-yellow-400" /> Hold Requests</CardTitle>
            <CardDescription>{range.from} to {range.to}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{data?.holdRequest?.count ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><FileEdit size={18} className="text-purple-400" /> Change Requests</CardTitle>
            <CardDescription>{range.from} to {range.to}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{data?.changeRequest?.count ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Wallet statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Wallet Statistics</CardTitle>
          <CardDescription>{range.from} to {range.to}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-gray-100 pt-4">
          <div>
            <p className="text-xl font-bold text-gray-900">{rupee(data?.walletStats?.totalAmount)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Amount</p>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{rupee(data?.walletStats?.totalRefundedAmount)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Refunded</p>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{rupee(data?.walletStats?.totalRechargeCash)}</p>
            <p className="text-xs text-gray-500 mt-1">Recharge (Cash)</p>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{rupee(data?.walletStats?.totalRechargeOnline)}</p>
            <p className="text-xs text-gray-500 mt-1">Recharge (Online)</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Wallet Statistics — Today</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3 border-t border-gray-100 pt-4">
          <div>
            <p className="text-xl font-bold text-gray-900">{rupee(data?.walletStatsToday?.totalRecharge)}</p>
            <p className="text-xs text-gray-500 mt-1">Wallet Recharge</p>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{rupee(data?.walletStatsToday?.totalRechargeCash)}</p>
            <p className="text-xs text-gray-500 mt-1">Recharge (Cash)</p>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{rupee(data?.walletStatsToday?.totalRechargeOnline)}</p>
            <p className="text-xs text-gray-500 mt-1">Recharge (Online)</p>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Alerts</CardTitle>
            <Badge variant="default">{data?.alerts?.total ?? 0} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-4 mb-4">
            {ALERT_TABS.map((tab) => {
              const Icon = tab.icon;
              const count = data?.alerts?.counts?.[tab.key] || 0;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                  {count > 0 && (
                    <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-gray-300'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto">
            {activeItems.length === 0 && (
              <p className="text-gray-500 text-sm py-6 text-center">No {ALERT_TABS.find(t => t.key === activeTab)?.label.toLowerCase()} alerts.</p>
            )}
            {activeItems.map((item: any) => (
              <div key={item.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-blue-300">{item.title}</p>
                  <p className="text-sm text-gray-700 mt-0.5 break-words">{item.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(item.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0 text-gray-500 hover:text-red-400" onClick={() => dismissAlert(item.id)} title="Dismiss">
                  <X size={16} />
                </Button>
              </div>
            ))}
            {activeCount > activeItems.length && (
              <p className="text-xs text-gray-500 text-center pt-2">Showing latest {activeItems.length} of {activeCount}.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
