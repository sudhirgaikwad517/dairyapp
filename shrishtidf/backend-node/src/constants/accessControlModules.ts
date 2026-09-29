export interface AccessControlModule {
  key: string;
  label: string;
}

export interface AccessControlSection {
  key: string;
  label: string;
  modules: AccessControlModule[];
}

export const ACCESS_CONTROL_CATALOG: AccessControlSection[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    modules: [{ key: 'dashboard', label: 'Dashboard' }]
  },
  {
    key: 'orders',
    label: 'Orders',
    modules: [
      { key: 'ecom_orders', label: 'Ecom Orders' },
      { key: 'dispatch_sheet', label: 'Dispatch Sheet' },
      { key: 'inventory', label: 'Inventory' }
    ]
  },
  {
    key: 'customer',
    label: 'Customer',
    modules: [
      { key: 'customers', label: 'Customer (incl. Sequencing, Route-wise, Map & Location views)' },
      { key: 'leads', label: 'Leads' }
    ]
  },
  {
    key: 'masters',
    label: 'Masters',
    modules: [
      { key: 'staff_type', label: 'Staff Type' },
      { key: 'office_staff', label: 'Office Staff' },
      { key: 'product_category', label: 'Product Category' },
      { key: 'product_sub_category', label: 'Product Sub Category' },
      { key: 'products', label: 'Products' },
      { key: 'delivery_mode', label: 'Delivery Mode' },
      { key: 'delivery_charge', label: 'Delivery Charge' },
      { key: 'banner', label: 'Banner' },
      { key: 'cutoff_time', label: 'Cut Off Time' },
      { key: 'email_terms', label: 'Email Terms & Conditions' },
      { key: 'cancel_reason', label: 'Cancel Reason' },
      { key: 'content_pages', label: 'About Us / Policies' },
      { key: 'coupons', label: 'Coupons' },
      { key: 'referral_plan', label: 'Referral Plan' },
      { key: 'app_assets', label: 'App Images (Splash / Login)' }
    ]
  },
  {
    key: 'logistics',
    label: 'Logistics',
    modules: [
      { key: 'hub', label: 'Hub' },
      { key: 'delivery_area', label: 'Delivery Area' },
      { key: 'sub_area', label: 'Sub Area' },
      { key: 'apartment', label: 'Apartment' },
      { key: 'route', label: 'Route' },
      { key: 'delivery_boy', label: 'Delivery Boy' },
      { key: 'mark_daily_delivery', label: 'Mark Daily Delivery' },
      { key: 'delivery_zones', label: 'Delivery Zones' }
    ]
  },
  {
    key: 'subscriptions',
    label: 'Subscriptions',
    modules: [
      { key: 'subscribe', label: 'Subscribe' },
      { key: 'change_request', label: 'Change Request' },
      { key: 'vacation', label: 'Vacation' },
      { key: 'one_time_order', label: 'One Time Order' },
      { key: 'subscriptions', label: 'Subscriptions' }
    ]
  },
  {
    key: 'reports',
    label: 'Reports',
    modules: [
      { key: 'audit_trail', label: 'Audit Trail' },
      { key: 'daily_planner', label: 'Daily Planner (incl. Hub-Wise, Delivery Boy-Wise & Pending Delivery views)' },
      { key: 'mark_delivery_report', label: 'Mark Delivery Report' },
      { key: 'pause_resume_report', label: 'Pause Resume Request Report' },
      { key: 'change_request_report', label: 'Change Request Report (incl. Today & Tomorrow view)' },
      { key: 'postpaid_inactive_report', label: 'Postpaid Inactive Plan Report' },
      { key: 'delivery_area_report', label: 'Delivery Area Report' }
    ]
  },
  {
    key: 'revenue_report',
    label: 'Revenue Report',
    modules: [
      { key: 'revenue_order_report', label: 'Revenue Order Report' },
      { key: 'revenue_subscription_report', label: 'Revenue Subscription Report' }
    ]
  },
  {
    key: 'wallet',
    label: 'Wallet',
    modules: [
      { key: 'wallet_report', label: 'Customer Wallet Report' },
      { key: 'customer_billing', label: 'Customer Billing' },
      { key: 'low_wallet_balance_report', label: 'Low Wallet Balance Report' },
      { key: 'wallet_summary_report', label: 'Wallet Summary Report' }
    ]
  },
  {
    key: 'feedback',
    label: 'Feedback',
    modules: [
      { key: 'feedback_master', label: 'Feedback Master' },
      { key: 'feedback', label: 'Feedback' }
    ]
  },
  {
    key: 'notifications',
    label: 'SMS / Notifications',
    modules: [{ key: 'notifications', label: 'Notifications' }]
  },
  {
    key: 'user_access_control',
    label: 'User Access Control',
    modules: [{ key: 'user_access_control', label: 'User Access Control' }]
  },
  {
    key: 'farm_visit',
    label: 'Farm Visit',
    modules: [{ key: 'farm_visit', label: 'Farm Visit' }]
  }
];

export const ALL_MODULE_KEYS = ACCESS_CONTROL_CATALOG.flatMap((s) => s.modules.map((m) => m.key));
