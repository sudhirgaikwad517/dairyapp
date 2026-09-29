import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Calendar,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Network,
  BarChart3,
  FileBarChart,
  Wallet,
  MessageSquare,
  Bell,
  BellRing,
  Navigation,
  Settings,
  UserCog,
  Tractor,
  KeyRound,
  ChevronsUpDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { getModuleKeyForPath } from '../lib/permissions';
import AccessDenied from '../components/AccessDenied';
import ChangePasswordModal from '../components/ChangePasswordModal';

type NavLeaf = { name: string; path: string; icon: React.ComponentType<{ size?: number; className?: string }> };
type NavGroup = { name: string; icon: React.ComponentType<{ size?: number; className?: string }>; items: { name: string; path: string }[] };
type NavEntry = ({ type: 'link' } & NavLeaf) | ({ type: 'group' } & NavGroup);

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, isStaff, can, logout } = useAuth();
  const [deniedMessage, setDeniedMessage] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      setDeniedMessage((e as CustomEvent).detail);
      window.clearTimeout((handler as any)._t);
      (handler as any)._t = window.setTimeout(() => setDeniedMessage(null), 4000);
    };
    window.addEventListener('permission-denied', handler);
    return () => window.removeEventListener('permission-denied', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems: NavEntry[] = [
    { type: 'link', name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    {
      type: 'group', name: 'Orders', icon: ShoppingCart,
      items: [
        { name: 'Ecom Orders', path: '/orders' },
        { name: 'Dispatch Sheet', path: '/dispatch' },
        { name: 'Inventory', path: '/inventory' },
      ]
    },
    {
      type: 'group', name: 'Customers', icon: Users,
      items: [
        { name: 'Customers', path: '/customers' },
        { name: 'Leads / Enquiry', path: '/leads' },
      ]
    },
    {
      type: 'group', name: 'Subscriptions', icon: Calendar,
      items: [
        { name: 'Subscribe', path: '/subscriptions/subscribe' },
        { name: 'Change Request', path: '/subscriptions/change-request' },
        { name: 'Vacation', path: '/subscriptions/vacations' },
        { name: 'One Time Order', path: '/subscriptions/one-time-order' },
        { name: 'Subscriptions', path: '/subscriptions' },
      ]
    },
    {
      type: 'group', name: 'Wallet', icon: Wallet,
      items: [
        { name: 'Customer Wallet Report', path: '/wallet/report' },
        { name: 'Cash Requests', path: '/wallet/cash-requests' },
        { name: 'Customer Billing', path: '/wallet/billing' },
        { name: 'Low Wallet Balance Report', path: '/wallet/low-balance' },
        { name: 'Wallet Summary Report', path: '/wallet/summary' }
      ]
    },
    {
      type: 'group', name: 'Feedback', icon: MessageSquare,
      items: [
        { name: 'Feedback Master', path: '/feedback/master' },
        { name: 'Feedback', path: '/feedback' }
      ]
    },
    { type: 'link', name: 'Notifications', path: '/notifications', icon: Bell },
    { type: 'link', name: 'Farm Visit', path: '/farm-visit', icon: Tractor },
    {
      type: 'group', name: 'Logistics', icon: Network,
      items: [
        { name: 'Hub', path: '/logistics/hubs' },
        { name: 'Delivery Area', path: '/logistics/delivery-areas' },
        { name: 'Sub Area', path: '/logistics/sub-areas' },
        { name: 'Apartment', path: '/logistics/apartments' },
        { name: 'Route', path: '/logistics/routes' },
        { name: 'Delivery Boy', path: '/logistics/delivery-boys' },
        { name: 'Delivery Zones', path: '/zones' },
      ]
    },
    {
      type: 'group', name: 'Delivery Operations', icon: Navigation,
      items: [
        { name: 'Mark Daily Delivery', path: '/logistics/mark-daily-delivery' },
        { name: 'Customer Sequencing', path: '/logistics/customer-sequencing' },
        { name: 'Route-wise Customers', path: '/logistics/route-wise-customers' },
        { name: 'Mark Customer Location', path: '/logistics/mark-location' },
        { name: 'Delivery Route Map', path: '/logistics/route-map' },
      ]
    },
    {
      type: 'group', name: 'Reports', icon: FileBarChart,
      items: [
        { name: 'Audit Trail', path: '/reports/audit-trail' },
        { name: 'Daily Planner', path: '/reports/daily-planner' },
        { name: 'Hub-Wise Daily Planner Report', path: '/reports/hub-wise-daily-planner' },
        { name: 'Delivery Boy-Wise Daily Planner Report', path: '/reports/delivery-boy-wise-daily-planner' },
        { name: 'Delivery Boy Wise Pending Delivery Report', path: '/reports/pending-delivery' },
        { name: 'Mark Delivery Report', path: '/reports/mark-delivery' },
        { name: 'Pause Resume Request Report', path: '/reports/pause-resume' },
        { name: 'Customer - Subscription Change Request Report', path: '/reports/change-requests' },
        { name: 'Change Request For Today & Tomorrow', path: '/reports/change-requests-today-tomorrow' },
        { name: 'Postpaid Inactive Plan Report', path: '/reports/postpaid-inactive' },
        { name: 'Delivery Area Report', path: '/reports/delivery-area' },
      ]
    },
    {
      type: 'group', name: 'Revenue Report', icon: BarChart3,
      items: [
        { name: 'Revenue Order Report', path: '/revenue-report/orders' },
        { name: 'Revenue Subscription Report', path: '/revenue-report/subscriptions' },
      ]
    },
    {
      type: 'group', name: 'Products', icon: Package,
      items: [
        { name: 'Products', path: '/products' },
        { name: 'Product Category', path: '/categories' },
        { name: 'Product Sub Category', path: '/product-sub-categories' },
      ]
    },
    {
      // Everything that shapes what customers see in the app/website — banners, legal text,
      // the order cutoff cutoff rule, cancel reasons, delivery mode & charge options.
      type: 'group', name: 'App Settings', icon: Settings,
      items: [
        { name: 'Banner', path: '/banners' },
        { name: 'Cut Off Time', path: '/cutoff-time' },
        { name: 'Email Terms & Conditions', path: '/email-terms' },
        { name: 'Cancel Reason', path: '/cancel-reasons' },
        { name: 'Delivery Mode', path: '/delivery-modes' },
        { name: 'Delivery Charge', path: '/delivery-charges' },
        { name: 'About Us & Policies', path: '/content-pages' },
        { name: 'Coupons', path: '/coupons' },
        { name: 'Referral Plan', path: '/referral-plan' },
        { name: 'App Images', path: '/app-assets' },
      ]
    },
    {
      type: 'group', name: 'Staff & Access', icon: UserCog,
      items: [
        { name: 'Staff Type', path: '/staff-types' },
        { name: 'Office Staff', path: '/office-staff' },
        { name: 'User Access Control', path: '/user-access-control' },
      ]
    },
  ];

  const isGroupActive = (group: NavGroup) => group.items.some((i) => location.pathname.startsWith(i.path));
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of navItems) {
      if (item.type === 'group') initial[item.name] = isGroupActive(item);
    }
    return initial;
  });

  // "User Access Control" grants permissions itself, so it stays super-admin-only in the nav
  // regardless of what any staff member's permission matrix says — matching the backend lock.
  const canSeeNavPath = (path: string) => {
    if (!isStaff) return true;
    if (path === '/user-access-control') return false;
    return can(getModuleKeyForPath(path), 'canView');
  };

  const visibleNavItems = navItems
    .map((item) => {
      if (item.type === 'group') {
        const items = item.items.filter((sub) => canSeeNavPath(sub.path));
        return items.length ? { ...item, items } : null;
      }
      return canSeeNavPath(item.path) ? item : null;
    })
    .filter((item): item is NavEntry => item !== null);

  const currentModuleKey = getModuleKeyForPath(location.pathname);
  const isAccessControlPath = location.pathname.replace(/^\/+/, '').startsWith('user-access-control');
  const pageAllowed = !isStaff || (!isAccessControlPath && can(currentModuleKey, 'canView'));

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  const toggleGroup = (name: string) => setOpenGroups((g) => ({ ...g, [name]: !g[name] }));

  return (
    <div className="h-screen bg-gray-50 text-gray-900 flex overflow-hidden selection:bg-blue-200">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Shrishti Admin
          </span>
          <button className="lg:hidden text-gray-400 hover:text-gray-900" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
          {visibleNavItems.map((item) => {
            if (item.type === 'group') {
              const active = isGroupActive(item);
              const open = !!openGroups[item.name];
              return (
                <div key={item.name}>
                  <button
                    onClick={() => toggleGroup(item.name)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                      active ? "text-blue-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <item.icon size={18} className={cn("transition-colors", active ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600")} />
                    <span className="flex-1 text-left">{item.name}</span>
                    <ChevronDown size={16} className={cn("transition-transform", open ? "rotate-180" : "", active ? "text-blue-600" : "text-gray-400")} />
                  </button>
                  {open && (
                    <div className="ml-6 mt-1 space-y-1 border-l border-gray-200 pl-3">
                      {item.items.map((sub) => (
                        <NavLink
                          key={sub.name}
                          to={sub.path}
                          end
                          className={({ isActive }) => cn(
                            "block px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                            isActive ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          )}
                        >
                          {sub.name}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={18} className={cn("transition-colors", isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600")} />
                    {item.name}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-white border-b border-gray-200 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden text-gray-400 hover:text-gray-900"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative rounded-full text-gray-400 hover:text-gray-900">
              <BellRing size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            </Button>
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full hover:bg-gray-50 pl-1 pr-2 py-1 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 p-0.5 shrink-0">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-xs font-bold text-blue-600">
                    {(user?.name || 'AD').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-gray-900 leading-tight">{user?.name || 'Admin'}</p>
                  <p className="text-xs text-gray-500 leading-tight">{isStaff ? user?.staffTypeName : 'Super Admin'}</p>
                </div>
                <ChevronsUpDown size={14} className="text-gray-400 hidden sm:block" />
              </button>

              {profileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                    <div className="px-3 py-2 border-b border-gray-100 sm:hidden">
                      <p className="text-sm font-medium text-gray-900">{user?.name || 'Admin'}</p>
                      <p className="text-xs text-gray-500">{isStaff ? user?.staffTypeName : 'Super Admin'}</p>
                    </div>
                    <button
                      onClick={() => { setProfileMenuOpen(false); setShowChangePassword(true); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <KeyRound size={16} className="text-gray-400" /> Change Password
                    </button>
                    <button
                      onClick={() => { setProfileMenuOpen(false); handleLogout(); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden z-10 p-4 sm:p-6 lg:p-8">
          {pageAllowed ? <Outlet /> : <AccessDenied />}
        </div>
      </main>

      {/* Permission-denied toast */}
      {deniedMessage && (
        <div className="fixed bottom-6 right-6 z-[60] bg-red-600 text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg max-w-xs">
          {deniedMessage}
        </div>
      )}

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </div>
  );
}
