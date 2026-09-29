export type PermissionAction = 'canCreate' | 'canUpdate' | 'canView' | 'canPdf' | 'canExcel';

export interface ModulePermission {
  canCreate: boolean;
  canUpdate: boolean;
  canView: boolean;
  canPdf: boolean;
  canExcel: boolean;
}

export interface CatalogModule { key: string; label: string; }
export interface CatalogSection { key: string; label: string; modules: CatalogModule[]; }

export interface CurrentUser {
  type: 'admin' | 'staff';
  name: string;
  staffTypeName?: string;
  catalog?: CatalogSection[];
  permissions: Record<string, ModulePermission> | null; // null for admin (full access, no map needed)
}

// Maps a frontend route path (relative to AdminLayout's "/") to the module_key
// that gates it on the backend. Ordered most-specific prefix first — the first
// prefix that matches (exact, or pathname.startsWith(prefix + '/')) wins.
export const PATH_MODULE_MAP: { prefix: string; moduleKey: string }[] = [
  { prefix: 'dashboard', moduleKey: 'dashboard' },

  { prefix: 'orders', moduleKey: 'ecom_orders' },
  { prefix: 'dispatch', moduleKey: 'dispatch_sheet' },
  { prefix: 'inventory', moduleKey: 'inventory' },

  { prefix: 'customers', moduleKey: 'customers' },
  { prefix: 'leads', moduleKey: 'leads' },

  { prefix: 'revenue-report/orders', moduleKey: 'revenue_order_report' },
  { prefix: 'revenue-report/subscriptions', moduleKey: 'revenue_subscription_report' },

  { prefix: 'wallet/report', moduleKey: 'wallet_report' },
  { prefix: 'wallet/cash-requests', moduleKey: 'wallet_report' },
  { prefix: 'wallet/add-money', moduleKey: 'wallet_report' },
  { prefix: 'wallet/debit-money', moduleKey: 'wallet_report' },
  { prefix: 'wallet/customer', moduleKey: 'wallet_report' },
  { prefix: 'wallet/billing', moduleKey: 'customer_billing' },
  { prefix: 'wallet/low-balance', moduleKey: 'low_wallet_balance_report' },
  { prefix: 'wallet/summary', moduleKey: 'wallet_summary_report' },

  { prefix: 'reports/audit-trail', moduleKey: 'audit_trail' },
  { prefix: 'reports/hub-wise-daily-planner', moduleKey: 'daily_planner' },
  { prefix: 'reports/delivery-boy-wise-daily-planner', moduleKey: 'daily_planner' },
  { prefix: 'reports/pending-delivery', moduleKey: 'daily_planner' },
  { prefix: 'reports/daily-planner', moduleKey: 'daily_planner' },
  { prefix: 'reports/pause-resume', moduleKey: 'pause_resume_report' },
  { prefix: 'reports/change-requests-today-tomorrow', moduleKey: 'change_request_report' },
  { prefix: 'reports/change-requests', moduleKey: 'change_request_report' },
  { prefix: 'reports/mark-delivery', moduleKey: 'mark_delivery_report' },
  { prefix: 'reports/postpaid-inactive', moduleKey: 'postpaid_inactive_report' },
  { prefix: 'reports/delivery-area', moduleKey: 'delivery_area_report' },

  { prefix: 'products', moduleKey: 'products' },
  { prefix: 'categories', moduleKey: 'product_category' },
  { prefix: 'product-sub-categories', moduleKey: 'product_sub_category' },
  { prefix: 'staff-types', moduleKey: 'staff_type' },
  { prefix: 'office-staff', moduleKey: 'office_staff' },

  { prefix: 'subscriptions/subscribe', moduleKey: 'subscribe' },
  { prefix: 'subscriptions/one-time-order', moduleKey: 'one_time_order' },
  { prefix: 'subscriptions/change-request', moduleKey: 'change_request' },
  { prefix: 'subscriptions/vacations', moduleKey: 'vacation' },
  { prefix: 'subscriptions', moduleKey: 'subscriptions' },

  { prefix: 'zones', moduleKey: 'delivery_zones' },
  { prefix: 'delivery-modes', moduleKey: 'delivery_mode' },
  { prefix: 'delivery-charges', moduleKey: 'delivery_charge' },
  { prefix: 'banners', moduleKey: 'banner' },
  { prefix: 'cutoff-time', moduleKey: 'cutoff_time' },
  { prefix: 'email-terms', moduleKey: 'email_terms' },
  { prefix: 'cancel-reasons', moduleKey: 'cancel_reason' },
  { prefix: 'content-pages', moduleKey: 'content_pages' },
  { prefix: 'coupons', moduleKey: 'coupons' },
  { prefix: 'referral-plan', moduleKey: 'referral_plan' },
  { prefix: 'app-assets', moduleKey: 'app_assets' },

  { prefix: 'feedback/master', moduleKey: 'feedback_master' },
  { prefix: 'feedback', moduleKey: 'feedback' },

  { prefix: 'notifications', moduleKey: 'notifications' },

  { prefix: 'user-access-control', moduleKey: 'user_access_control' },
  { prefix: 'farm-visit', moduleKey: 'farm_visit' },

  { prefix: 'logistics/hubs', moduleKey: 'hub' },
  { prefix: 'logistics/delivery-areas', moduleKey: 'delivery_area' },
  { prefix: 'logistics/sub-areas', moduleKey: 'sub_area' },
  { prefix: 'logistics/apartments', moduleKey: 'apartment' },
  { prefix: 'logistics/routes', moduleKey: 'route' },
  { prefix: 'logistics/delivery-boys', moduleKey: 'delivery_boy' },
  { prefix: 'logistics/mark-daily-delivery', moduleKey: 'mark_daily_delivery' },
  // These are alternate views over the same Customer data (reorder sequence, route grouping, GPS pin, map) —
  // they call the same /admin/customers endpoints, so they share the 'customers' permission rather than having their own.
  { prefix: 'logistics/customer-sequencing', moduleKey: 'customers' },
  { prefix: 'logistics/route-wise-customers', moduleKey: 'customers' },
  { prefix: 'logistics/mark-location', moduleKey: 'customers' },
  { prefix: 'logistics/route-map', moduleKey: 'customers' },
].sort((a, b) => b.prefix.length - a.prefix.length);

export function getModuleKeyForPath(pathname: string): string | null {
  const clean = pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  for (const { prefix, moduleKey } of PATH_MODULE_MAP) {
    if (clean === prefix || clean.startsWith(prefix + '/')) return moduleKey;
  }
  return null;
}

export const EMPTY_PERMISSION: ModulePermission = { canCreate: false, canUpdate: false, canView: false, canPdf: false, canExcel: false };
export const FULL_PERMISSION: ModulePermission = { canCreate: true, canUpdate: true, canView: true, canPdf: true, canExcel: true };
