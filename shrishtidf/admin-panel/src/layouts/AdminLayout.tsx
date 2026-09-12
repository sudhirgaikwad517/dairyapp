import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Truck,
  MapPin,
  Calendar,
  LogOut,
  Menu,
  X,
  Boxes,
  BellRing,
  UserPlus,
  Image as ImageIcon,
  Clock,
  ChevronDown,
  PackageCheck,
  Mail,
  XCircle,
  Network
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';

type NavLeaf = { name: string; path: string; icon: React.ComponentType<{ size?: number; className?: string }> };
type NavGroup = { name: string; icon: React.ComponentType<{ size?: number; className?: string }>; items: { name: string; path: string }[] };
type NavEntry = ({ type: 'link' } & NavLeaf) | ({ type: 'group' } & NavGroup);

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/login');
  };

  const navItems: NavEntry[] = [
    { type: 'link', name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { type: 'link', name: 'Orders', path: '/orders', icon: ShoppingCart },
    { type: 'link', name: 'Dispatch Sheet', path: '/dispatch', icon: Truck },
    {
      type: 'group', name: 'Logistics', icon: Network,
      items: [
        { name: 'Hub', path: '/logistics/hubs' },
        { name: 'Delivery Area', path: '/logistics/delivery-areas' },
        { name: 'Sub Area', path: '/logistics/sub-areas' },
        { name: 'Apartment', path: '/logistics/apartments' },
        { name: 'Route', path: '/logistics/routes' },
        { name: 'Delivery Boy', path: '/logistics/delivery-boys' },
        { name: 'Customer Sequencing', path: '/logistics/customer-sequencing' },
        { name: 'Mark Daily Delivery', path: '/logistics/mark-daily-delivery' },
        { name: 'Delivery Route Map', path: '/logistics/route-map' },
        { name: 'Mark Customer Location', path: '/logistics/mark-location' },
        { name: 'Route-wise Customers', path: '/logistics/route-wise-customers' },
      ]
    },
    {
      type: 'group', name: 'Products And Staff', icon: Package,
      items: [
        { name: 'Products', path: '/products' },
        { name: 'Product Category', path: '/categories' },
        { name: 'Product Sub Category', path: '/product-sub-categories' },
        { name: 'Staff Type', path: '/staff-types' },
        { name: 'Office Staff', path: '/office-staff' },
      ]
    },
    { type: 'link', name: 'Inventory', path: '/inventory', icon: Boxes },
    { type: 'link', name: 'Customers', path: '/customers', icon: Users },
    { type: 'link', name: 'Leads', path: '/leads', icon: UserPlus },
    { type: 'link', name: 'Subscriptions', path: '/subscriptions', icon: Calendar },
    { type: 'link', name: 'Delivery Zones', path: '/zones', icon: MapPin },
    { type: 'link', name: 'Delivery Mode', path: '/delivery-modes', icon: PackageCheck },
    { type: 'link', name: 'Delivery Charge', path: '/delivery-charges', icon: Truck },
    { type: 'link', name: 'Banner', path: '/banners', icon: ImageIcon },
    { type: 'link', name: 'Cut Off Time', path: '/cutoff-time', icon: Clock },
    { type: 'link', name: 'Email Terms & Conditions', path: '/email-terms', icon: Mail },
    { type: 'link', name: 'Cancel Reason', path: '/cancel-reasons', icon: XCircle },
  ];

  const isGroupActive = (group: NavGroup) => group.items.some((i) => location.pathname.startsWith(i.path));
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of navItems) {
      if (item.type === 'group') initial[item.name] = isGroupActive(item);
    }
    return initial;
  });

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
          {navItems.map((item) => {
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

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
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
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 p-0.5">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-xs font-bold text-blue-600">
                AD
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden z-10 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
