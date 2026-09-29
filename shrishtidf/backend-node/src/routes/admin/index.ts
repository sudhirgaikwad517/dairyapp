import { Router } from 'express';
import { adminStatsController } from '../../controllers/admin/AdminStatsController';
import { adminOrderController } from '../../controllers/admin/AdminOrderController';
import { adminProductController } from '../../controllers/admin/AdminProductController';
import { adminCustomerController } from '../../controllers/admin/AdminCustomerController';
import { adminLogisticsController } from '../../controllers/admin/AdminLogisticsController';
import { adminLeadController } from '../../controllers/admin/AdminLeadController';
import { adminHubController } from '../../controllers/admin/AdminHubController';
import { adminCategoryController } from '../../controllers/admin/AdminCategoryController';
import { adminSubCategoryController } from '../../controllers/admin/AdminSubCategoryController';
import { adminBannerController } from '../../controllers/admin/AdminBannerController';
import { adminCutoffController } from '../../controllers/admin/AdminCutoffController';
import { adminStaffTypeController } from '../../controllers/admin/AdminStaffTypeController';
import { adminOfficeStaffController } from '../../controllers/admin/AdminOfficeStaffController';
import { adminDeliveryModeController } from '../../controllers/admin/AdminDeliveryModeController';
import { adminDeliveryChargeController } from '../../controllers/admin/AdminDeliveryChargeController';
import { adminEmailTermsController } from '../../controllers/admin/AdminEmailTermsController';
import { adminCancelReasonController } from '../../controllers/admin/AdminCancelReasonController';
import { adminDeliveryAreaController } from '../../controllers/admin/AdminDeliveryAreaController';
import { adminSubAreaController } from '../../controllers/admin/AdminSubAreaController';
import { adminApartmentController } from '../../controllers/admin/AdminApartmentController';
import { adminRouteController } from '../../controllers/admin/AdminRouteController';
import { adminDeliveryBoyController } from '../../controllers/admin/AdminDeliveryBoyController';
import { adminDailyDeliveryController } from '../../controllers/admin/AdminDailyDeliveryController';
import { adminSubscriptionController } from '../../controllers/admin/AdminSubscriptionController';
import { adminVacationController } from '../../controllers/admin/AdminVacationController';
import { adminReportController } from '../../controllers/admin/AdminReportController';
import { adminWalletController } from '../../controllers/admin/AdminWalletController';
import { adminBillingController } from '../../controllers/admin/AdminBillingController';
import { adminFeedbackCategoryController } from '../../controllers/admin/AdminFeedbackCategoryController';
import { adminFeedbackController } from '../../controllers/admin/AdminFeedbackController';
import { adminNotificationController } from '../../controllers/admin/AdminNotificationController';
import { adminAccessControlController } from '../../controllers/admin/AdminAccessControlController';
import { adminFarmVisitController } from '../../controllers/admin/AdminFarmVisitController';
import { adminContentPageController } from '../../controllers/admin/AdminContentPageController';
import { adminCouponController } from '../../controllers/admin/AdminCouponController';
import { adminReferralPlanController } from '../../controllers/admin/AdminReferralPlanController';
import { adminAppAssetsController, appAssetUpload } from '../../controllers/admin/AdminAppAssetsController';

import { adminAuthController } from '../../controllers/admin/AdminAuthController';
import { authenticate, requirePermission, requireSuperAdmin } from '../../middleware/adminAuth';
import { loginLimiter } from '../../middleware/rateLimiters';

const router = Router();

// ---- Public auth routes (no token required) ----
router.post('/login', loginLimiter, adminAuthController.login.bind(adminAuthController));
router.post('/staff-login', loginLimiter, adminAuthController.staffLogin.bind(adminAuthController));

// ---- Everything below requires a valid admin OR staff session ----
router.use(authenticate);

router.get('/me', adminAuthController.me.bind(adminAuthController));
router.patch('/me/password', adminAuthController.changePassword.bind(adminAuthController));
router.post('/logout', adminAuthController.logout.bind(adminAuthController));

// Stats / Dashboard
router.get('/dashboard', requirePermission('dashboard', 'view'), adminStatsController.getDashboardStats.bind(adminStatsController));
router.patch('/alerts/:id/dismiss', requirePermission('dashboard', 'update'), adminStatsController.dismissAlert.bind(adminStatsController));

// Orders
router.get('/orders/export', requirePermission('ecom_orders', 'excel'), adminOrderController.exportOrders.bind(adminOrderController));
router.get('/orders/:id', requirePermission('ecom_orders', 'view'), adminOrderController.show.bind(adminOrderController));
router.patch('/orders/:id/status', requirePermission('ecom_orders', 'update'), adminOrderController.updateStatus.bind(adminOrderController));
router.patch('/orders/:id/cancel', requirePermission('ecom_orders', 'update'), adminOrderController.cancel.bind(adminOrderController));
router.patch('/orders/:id/narration', requirePermission('ecom_orders', 'update'), adminOrderController.updateNarration.bind(adminOrderController));
router.get('/orders', requirePermission('ecom_orders', 'view'), adminOrderController.index.bind(adminOrderController));

// Catalog
router.get('/products/export', requirePermission('products', 'excel'), adminProductController.exportProducts.bind(adminProductController));
router.get('/products/sub-categories', requirePermission('products', 'view'), adminProductController.getSubCategories.bind(adminProductController));
router.get('/products/:id', requirePermission('products', 'view'), adminProductController.getProduct.bind(adminProductController));
router.patch('/products/:id', requirePermission('products', 'update'), adminProductController.updateProduct.bind(adminProductController));
router.get('/products', requirePermission('products', 'view'), adminProductController.getProducts.bind(adminProductController));
router.post('/products', requirePermission('products', 'create'), adminProductController.createProduct.bind(adminProductController));
// Lite lookup shared across other modules' dropdowns — any logged-in staff can read it.
router.get('/categories', adminProductController.getCategories.bind(adminProductController));

// Product Categories (full management)
router.get('/product-categories/export', requirePermission('product_category', 'excel'), adminCategoryController.exportCategories.bind(adminCategoryController));
router.get('/product-categories/:id', requirePermission('product_category', 'view'), adminCategoryController.show.bind(adminCategoryController));
router.patch('/product-categories/:id', requirePermission('product_category', 'update'), adminCategoryController.update.bind(adminCategoryController));
router.get('/product-categories', requirePermission('product_category', 'view'), adminCategoryController.index.bind(adminCategoryController));
router.post('/product-categories', requirePermission('product_category', 'create'), adminCategoryController.create.bind(adminCategoryController));

// Product Sub Categories (full management)
router.get('/product-sub-categories/export', requirePermission('product_sub_category', 'excel'), adminSubCategoryController.exportSubCategories.bind(adminSubCategoryController));
router.get('/product-sub-categories/:id', requirePermission('product_sub_category', 'view'), adminSubCategoryController.show.bind(adminSubCategoryController));
router.patch('/product-sub-categories/:id', requirePermission('product_sub_category', 'update'), adminSubCategoryController.update.bind(adminSubCategoryController));
router.get('/product-sub-categories', requirePermission('product_sub_category', 'view'), adminSubCategoryController.index.bind(adminSubCategoryController));
router.post('/product-sub-categories', requirePermission('product_sub_category', 'create'), adminSubCategoryController.create.bind(adminSubCategoryController));

// Customers & Subscriptions
router.get('/customers/export', requirePermission('customers', 'excel'), adminCustomerController.exportCustomers.bind(adminCustomerController));
router.get('/customers/:id', requirePermission('customers', 'view'), adminCustomerController.getCustomer.bind(adminCustomerController));
router.patch('/customers/:id', requirePermission('customers', 'update'), adminCustomerController.updateCustomer.bind(adminCustomerController));
router.get('/customers', requirePermission('customers', 'view'), adminCustomerController.getCustomers.bind(adminCustomerController));
router.post('/customers', requirePermission('customers', 'create'), adminCustomerController.createCustomer.bind(adminCustomerController));
// Subscriptions (full management: catalog, subscribe, one-time order, change request, list)
router.get('/subscriptions/export', requirePermission('subscriptions', 'excel'), adminSubscriptionController.exportSubscriptions.bind(adminSubscriptionController));
router.get('/subscriptions/customer/:customerId/catalog', requirePermission('subscribe', 'view'), adminSubscriptionController.catalogForCustomer.bind(adminSubscriptionController));
router.get('/subscriptions/customer/:customerId/plans', requirePermission('subscriptions', 'view'), adminSubscriptionController.getCustomerPlans.bind(adminSubscriptionController));
router.post('/subscriptions/subscribe', requirePermission('subscribe', 'create'), adminSubscriptionController.subscribe.bind(adminSubscriptionController));
router.post('/subscriptions/one-time-order', requirePermission('one_time_order', 'create'), adminSubscriptionController.oneTimeOrder.bind(adminSubscriptionController));
router.patch('/subscriptions/:id/change-request', requirePermission('change_request', 'create'), adminSubscriptionController.requestChange.bind(adminSubscriptionController));
router.patch('/subscriptions/:id/pause', requirePermission('subscriptions', 'update'), adminSubscriptionController.pause.bind(adminSubscriptionController));
router.patch('/subscriptions/:id/resume', requirePermission('subscriptions', 'update'), adminSubscriptionController.resume.bind(adminSubscriptionController));
router.patch('/subscriptions/:id/inactive', requirePermission('subscriptions', 'update'), adminSubscriptionController.setInactive.bind(adminSubscriptionController));
router.patch('/subscriptions/:id/cancel', requirePermission('subscriptions', 'update'), adminSubscriptionController.cancel.bind(adminSubscriptionController));
router.get('/subscriptions/:id', requirePermission('subscriptions', 'view'), adminSubscriptionController.show.bind(adminSubscriptionController));
router.get('/subscriptions', requirePermission('subscriptions', 'view'), adminSubscriptionController.index.bind(adminSubscriptionController));

// Revenue Report (ecom/website orders statistics)
router.get('/reports/revenue/export', requirePermission('revenue_order_report', 'excel'), adminReportController.exportRevenue.bind(adminReportController));
router.get('/reports/revenue', requirePermission('revenue_order_report', 'view'), adminReportController.revenue.bind(adminReportController));
router.get('/reports/revenue-subscription/export', requirePermission('revenue_subscription_report', 'excel'), adminReportController.exportSubscriptionRevenue.bind(adminReportController));
router.get('/reports/revenue-subscription', requirePermission('revenue_subscription_report', 'view'), adminReportController.subscriptionRevenue.bind(adminReportController));

// Reports
router.get('/reports/audit-trail/export', requirePermission('audit_trail', 'excel'), adminReportController.exportAuditTrail.bind(adminReportController));
router.get('/reports/audit-trail', requirePermission('audit_trail', 'view'), adminReportController.auditTrail.bind(adminReportController));
router.get('/reports/pause-resume/export', requirePermission('pause_resume_report', 'excel'), adminReportController.exportPauseResume.bind(adminReportController));
router.get('/reports/pause-resume', requirePermission('pause_resume_report', 'view'), adminReportController.pauseResume.bind(adminReportController));
router.get('/reports/change-requests/export', requirePermission('change_request_report', 'excel'), adminReportController.exportChangeRequests.bind(adminReportController));
router.get('/reports/change-requests', requirePermission('change_request_report', 'view'), adminReportController.changeRequests.bind(adminReportController));
router.get('/reports/daily-planner/export', requirePermission('daily_planner', 'excel'), adminReportController.exportDailyPlanner.bind(adminReportController));
router.get('/reports/daily-planner', requirePermission('daily_planner', 'view'), adminReportController.dailyPlanner.bind(adminReportController));
router.get('/reports/mark-delivery/export', requirePermission('mark_delivery_report', 'excel'), adminReportController.exportMarkDelivery.bind(adminReportController));
router.get('/reports/mark-delivery', requirePermission('mark_delivery_report', 'view'), adminReportController.markDelivery.bind(adminReportController));
router.get('/reports/postpaid-inactive/export', requirePermission('postpaid_inactive_report', 'excel'), adminReportController.exportPostpaidInactive.bind(adminReportController));
router.get('/reports/postpaid-inactive', requirePermission('postpaid_inactive_report', 'view'), adminReportController.postpaidInactivePlans.bind(adminReportController));
router.get('/reports/delivery-area/export', requirePermission('delivery_area_report', 'excel'), adminReportController.exportDeliveryAreaReport.bind(adminReportController));
router.get('/reports/delivery-area', requirePermission('delivery_area_report', 'view'), adminReportController.deliveryAreaReport.bind(adminReportController));

// Wallet — Customer Wallet Report + Add/Debit Money
router.get('/wallet/report/export', requirePermission('wallet_report', 'excel'), adminWalletController.exportWalletReport.bind(adminWalletController));
router.get('/wallet/report', requirePermission('wallet_report', 'view'), adminWalletController.index.bind(adminWalletController));
router.post('/wallet/add-money', requirePermission('wallet_report', 'create'), adminWalletController.addMoney.bind(adminWalletController));
router.post('/wallet/debit-money', requirePermission('wallet_report', 'create'), adminWalletController.debitMoney.bind(adminWalletController));
router.get('/wallet/transactions/:customerId', requirePermission('wallet_report', 'view'), adminWalletController.transactions.bind(adminWalletController));
router.get('/wallet/cash-requests', requirePermission('wallet_report', 'view'), adminWalletController.cashRequests.bind(adminWalletController));
router.post('/wallet/cash-requests/:id/approve', requirePermission('wallet_report', 'create'), adminWalletController.approveCashRequest.bind(adminWalletController));
router.post('/wallet/cash-requests/:id/reject', requirePermission('wallet_report', 'create'), adminWalletController.rejectCashRequest.bind(adminWalletController));
router.get('/wallet/low-balance/export', requirePermission('low_wallet_balance_report', 'excel'), adminWalletController.exportLowBalance.bind(adminWalletController));
router.get('/wallet/low-balance', requirePermission('low_wallet_balance_report', 'view'), adminWalletController.lowBalance.bind(adminWalletController));
router.get('/wallet/summary/export', requirePermission('wallet_summary_report', 'excel'), adminWalletController.exportSummaryReport.bind(adminWalletController));
router.get('/wallet/summary', requirePermission('wallet_summary_report', 'view'), adminWalletController.summaryReport.bind(adminWalletController));

// Wallet — Customer Billing (postpaid)
router.get('/wallet/billing/export', requirePermission('customer_billing', 'excel'), adminBillingController.exportBillings.bind(adminBillingController));
router.get('/wallet/billing/:id', requirePermission('customer_billing', 'view'), adminBillingController.show.bind(adminBillingController));
router.patch('/wallet/billing/:id', requirePermission('customer_billing', 'update'), adminBillingController.update.bind(adminBillingController));
router.get('/wallet/billing', requirePermission('customer_billing', 'view'), adminBillingController.index.bind(adminBillingController));
router.post('/wallet/billing', requirePermission('customer_billing', 'create'), adminBillingController.create.bind(adminBillingController));

// Vacations
router.get('/vacations/export', requirePermission('vacation', 'excel'), adminVacationController.exportVacations.bind(adminVacationController));
router.post('/vacations/:id/end', requirePermission('vacation', 'update'), adminVacationController.endEarly.bind(adminVacationController));
router.get('/vacations', requirePermission('vacation', 'view'), adminVacationController.index.bind(adminVacationController));
router.post('/vacations', requirePermission('vacation', 'create'), adminVacationController.create.bind(adminVacationController));

// Masters (hubs, routes, delivery boys) — used by the Customer tab's dropdowns
router.get('/hubs/:id', requirePermission('hub', 'view'), adminHubController.show.bind(adminHubController));
router.patch('/hubs/:id', requirePermission('hub', 'update'), adminHubController.update.bind(adminHubController));
router.get('/hubs', requirePermission('hub', 'view'), adminHubController.index.bind(adminHubController));
router.post('/hubs', requirePermission('hub', 'create'), adminHubController.create.bind(adminHubController));
// Lite lookups shared across other modules' dropdowns — any logged-in staff can read them.
router.get('/routes', adminLogisticsController.getRoutes.bind(adminLogisticsController));
router.get('/delivery-boys', adminLogisticsController.getDeliveryBoys.bind(adminLogisticsController));

// Logistics — Delivery Area / Sub Area / Apartment
router.get('/logistics/delivery-areas/export', requirePermission('delivery_area', 'excel'), adminDeliveryAreaController.exportAreas.bind(adminDeliveryAreaController));
router.get('/logistics/delivery-areas/:id', requirePermission('delivery_area', 'view'), adminDeliveryAreaController.show.bind(adminDeliveryAreaController));
router.patch('/logistics/delivery-areas/:id', requirePermission('delivery_area', 'update'), adminDeliveryAreaController.update.bind(adminDeliveryAreaController));
router.get('/logistics/delivery-areas', requirePermission('delivery_area', 'view'), adminDeliveryAreaController.index.bind(adminDeliveryAreaController));
router.post('/logistics/delivery-areas', requirePermission('delivery_area', 'create'), adminDeliveryAreaController.create.bind(adminDeliveryAreaController));

router.get('/logistics/sub-areas/export', requirePermission('sub_area', 'excel'), adminSubAreaController.exportSubAreas.bind(adminSubAreaController));
router.get('/logistics/sub-areas/:id', requirePermission('sub_area', 'view'), adminSubAreaController.show.bind(adminSubAreaController));
router.patch('/logistics/sub-areas/:id', requirePermission('sub_area', 'update'), adminSubAreaController.update.bind(adminSubAreaController));
router.get('/logistics/sub-areas', requirePermission('sub_area', 'view'), adminSubAreaController.index.bind(adminSubAreaController));
router.post('/logistics/sub-areas', requirePermission('sub_area', 'create'), adminSubAreaController.create.bind(adminSubAreaController));

router.get('/logistics/apartments/export', requirePermission('apartment', 'excel'), adminApartmentController.exportApartments.bind(adminApartmentController));
router.get('/logistics/apartments/:id', requirePermission('apartment', 'view'), adminApartmentController.show.bind(adminApartmentController));
router.patch('/logistics/apartments/:id', requirePermission('apartment', 'update'), adminApartmentController.update.bind(adminApartmentController));
router.get('/logistics/apartments', requirePermission('apartment', 'view'), adminApartmentController.index.bind(adminApartmentController));
router.post('/logistics/apartments', requirePermission('apartment', 'create'), adminApartmentController.create.bind(adminApartmentController));

// Logistics — Route (full management; distinct from the lite /routes dropdown above)
router.get('/logistics/routes/export', requirePermission('route', 'excel'), adminRouteController.exportRoutes.bind(adminRouteController));
router.get('/logistics/routes/:id', requirePermission('route', 'view'), adminRouteController.show.bind(adminRouteController));
router.patch('/logistics/routes/:id', requirePermission('route', 'update'), adminRouteController.update.bind(adminRouteController));
router.get('/logistics/routes', requirePermission('route', 'view'), adminRouteController.index.bind(adminRouteController));
router.post('/logistics/routes', requirePermission('route', 'create'), adminRouteController.create.bind(adminRouteController));

// Logistics — Delivery Boy (full management; distinct from the lite /delivery-boys dropdown above)
router.get('/logistics/delivery-boys/export', requirePermission('delivery_boy', 'excel'), adminDeliveryBoyController.exportDeliveryBoys.bind(adminDeliveryBoyController));
router.get('/logistics/delivery-boys/:id', requirePermission('delivery_boy', 'view'), adminDeliveryBoyController.show.bind(adminDeliveryBoyController));
router.patch('/logistics/delivery-boys/:id', requirePermission('delivery_boy', 'update'), adminDeliveryBoyController.update.bind(adminDeliveryBoyController));
router.get('/logistics/delivery-boys', requirePermission('delivery_boy', 'view'), adminDeliveryBoyController.index.bind(adminDeliveryBoyController));
router.post('/logistics/delivery-boys', requirePermission('delivery_boy', 'create'), adminDeliveryBoyController.create.bind(adminDeliveryBoyController));

// Logistics — Mark Daily Delivery
router.get('/logistics/daily-deliveries', requirePermission('mark_daily_delivery', 'view'), adminDailyDeliveryController.index.bind(adminDailyDeliveryController));
router.post('/logistics/daily-deliveries', requirePermission('mark_daily_delivery', 'create'), adminDailyDeliveryController.save.bind(adminDailyDeliveryController));
router.post('/logistics/daily-deliveries/:id/unmark', requirePermission('mark_daily_delivery', 'update'), adminDailyDeliveryController.unmark.bind(adminDailyDeliveryController));

// Logistics & Inventory
router.get('/inventory', requirePermission('inventory', 'view'), adminLogisticsController.getInventory.bind(adminLogisticsController));
router.get('/zones', requirePermission('delivery_zones', 'view'), adminLogisticsController.getZones.bind(adminLogisticsController));
router.get('/dispatch', requirePermission('dispatch_sheet', 'view'), adminLogisticsController.getDispatchSheet.bind(adminLogisticsController));

// Leads
router.get('/leads', requirePermission('leads', 'view'), adminLeadController.index.bind(adminLeadController));
router.patch('/leads/:id/status', requirePermission('leads', 'update'), adminLeadController.updateStatus.bind(adminLeadController));

// Banners (full management)
router.get('/banners/export', requirePermission('banner', 'excel'), adminBannerController.exportBanners.bind(adminBannerController));
router.get('/banners/:id', requirePermission('banner', 'view'), adminBannerController.show.bind(adminBannerController));
router.patch('/banners/:id', requirePermission('banner', 'update'), adminBannerController.update.bind(adminBannerController));
router.delete('/banners/:id', requirePermission('banner', 'update'), adminBannerController.remove.bind(adminBannerController));
router.get('/banners', requirePermission('banner', 'view'), adminBannerController.index.bind(adminBannerController));
router.post('/banners', requirePermission('banner', 'create'), adminBannerController.create.bind(adminBannerController));

// Cut Off Time
router.get('/cutoff-time', requirePermission('cutoff_time', 'view'), adminCutoffController.show.bind(adminCutoffController));
router.patch('/cutoff-time', requirePermission('cutoff_time', 'update'), adminCutoffController.update.bind(adminCutoffController));

// Staff Type
router.get('/staff-types/:id', requirePermission('staff_type', 'view'), adminStaffTypeController.show.bind(adminStaffTypeController));
router.patch('/staff-types/:id', requirePermission('staff_type', 'update'), adminStaffTypeController.update.bind(adminStaffTypeController));
router.get('/staff-types', requirePermission('staff_type', 'view'), adminStaffTypeController.index.bind(adminStaffTypeController));
router.post('/staff-types', requirePermission('staff_type', 'create'), adminStaffTypeController.create.bind(adminStaffTypeController));

// Office Staff
router.get('/office-staff/export', requirePermission('office_staff', 'excel'), adminOfficeStaffController.exportStaff.bind(adminOfficeStaffController));
router.get('/office-staff/:id', requirePermission('office_staff', 'view'), adminOfficeStaffController.show.bind(adminOfficeStaffController));
router.patch('/office-staff/:id', requirePermission('office_staff', 'update'), adminOfficeStaffController.update.bind(adminOfficeStaffController));
router.get('/office-staff', requirePermission('office_staff', 'view'), adminOfficeStaffController.index.bind(adminOfficeStaffController));
router.post('/office-staff', requirePermission('office_staff', 'create'), adminOfficeStaffController.create.bind(adminOfficeStaffController));

// Delivery Mode
router.get('/delivery-modes/:id', requirePermission('delivery_mode', 'view'), adminDeliveryModeController.show.bind(adminDeliveryModeController));
router.patch('/delivery-modes/:id', requirePermission('delivery_mode', 'update'), adminDeliveryModeController.update.bind(adminDeliveryModeController));
router.get('/delivery-modes', requirePermission('delivery_mode', 'view'), adminDeliveryModeController.index.bind(adminDeliveryModeController));
router.post('/delivery-modes', requirePermission('delivery_mode', 'create'), adminDeliveryModeController.create.bind(adminDeliveryModeController));

// Delivery Charge
router.get('/delivery-charges/:id', requirePermission('delivery_charge', 'view'), adminDeliveryChargeController.show.bind(adminDeliveryChargeController));
router.patch('/delivery-charges/:id', requirePermission('delivery_charge', 'update'), adminDeliveryChargeController.update.bind(adminDeliveryChargeController));
router.delete('/delivery-charges/:id', requirePermission('delivery_charge', 'update'), adminDeliveryChargeController.remove.bind(adminDeliveryChargeController));
router.get('/delivery-charges', requirePermission('delivery_charge', 'view'), adminDeliveryChargeController.index.bind(adminDeliveryChargeController));
router.post('/delivery-charges', requirePermission('delivery_charge', 'create'), adminDeliveryChargeController.create.bind(adminDeliveryChargeController));

// Email Terms & Conditions (singleton)
router.get('/email-terms', requirePermission('email_terms', 'view'), adminEmailTermsController.show.bind(adminEmailTermsController));
router.patch('/email-terms', requirePermission('email_terms', 'update'), adminEmailTermsController.update.bind(adminEmailTermsController));

// Cancel Reason
router.get('/cancel-reasons/export', requirePermission('cancel_reason', 'excel'), adminCancelReasonController.exportReasons.bind(adminCancelReasonController));
router.get('/cancel-reasons/:id', requirePermission('cancel_reason', 'view'), adminCancelReasonController.show.bind(adminCancelReasonController));
router.patch('/cancel-reasons/:id', requirePermission('cancel_reason', 'update'), adminCancelReasonController.update.bind(adminCancelReasonController));
router.get('/cancel-reasons', requirePermission('cancel_reason', 'view'), adminCancelReasonController.index.bind(adminCancelReasonController));
router.post('/cancel-reasons', requirePermission('cancel_reason', 'create'), adminCancelReasonController.create.bind(adminCancelReasonController));

// Feedback Master (feedback options/categories)
router.get('/feedback-categories/export', requirePermission('feedback_master', 'excel'), adminFeedbackCategoryController.exportCategories.bind(adminFeedbackCategoryController));
router.get('/feedback-categories/:id', requirePermission('feedback_master', 'view'), adminFeedbackCategoryController.show.bind(adminFeedbackCategoryController));
router.patch('/feedback-categories/:id', requirePermission('feedback_master', 'update'), adminFeedbackCategoryController.update.bind(adminFeedbackCategoryController));
router.get('/feedback-categories', requirePermission('feedback_master', 'view'), adminFeedbackCategoryController.index.bind(adminFeedbackCategoryController));
router.post('/feedback-categories', requirePermission('feedback_master', 'create'), adminFeedbackCategoryController.create.bind(adminFeedbackCategoryController));

// Feedback
router.get('/feedback/export', requirePermission('feedback', 'excel'), adminFeedbackController.exportFeedback.bind(adminFeedbackController));
router.get('/feedback/:id', requirePermission('feedback', 'view'), adminFeedbackController.show.bind(adminFeedbackController));
router.patch('/feedback/:id/status', requirePermission('feedback', 'update'), adminFeedbackController.updateStatus.bind(adminFeedbackController));
router.patch('/feedback/:id/reply', requirePermission('feedback', 'update'), adminFeedbackController.reply.bind(adminFeedbackController));
router.get('/feedback', requirePermission('feedback', 'view'), adminFeedbackController.index.bind(adminFeedbackController));
router.post('/feedback', requirePermission('feedback', 'create'), adminFeedbackController.create.bind(adminFeedbackController));

// Notifications
router.get('/notifications/audience-preview', requirePermission('notifications', 'view'), adminNotificationController.previewAudience.bind(adminNotificationController));
router.get('/notifications/export', requirePermission('notifications', 'excel'), adminNotificationController.exportHistory.bind(adminNotificationController));
router.get('/notifications/:id', requirePermission('notifications', 'view'), adminNotificationController.show.bind(adminNotificationController));
router.get('/notifications', requirePermission('notifications', 'view'), adminNotificationController.index.bind(adminNotificationController));
router.post('/notifications', requirePermission('notifications', 'create'), adminNotificationController.send.bind(adminNotificationController));

// User Access Control — super-admin only, regardless of any staff permission row.
// (Letting a staff member manage access control would let them grant themselves more access.)
router.get('/access-control/catalog', requireSuperAdmin, adminAccessControlController.catalog.bind(adminAccessControlController));
router.get('/access-control/eligible-staff', requireSuperAdmin, adminAccessControlController.eligibleStaff.bind(adminAccessControlController));
router.get('/access-control/export', requireSuperAdmin, adminAccessControlController.exportList.bind(adminAccessControlController));
router.get('/access-control/:id', requireSuperAdmin, adminAccessControlController.show.bind(adminAccessControlController));
router.patch('/access-control/:id', requireSuperAdmin, adminAccessControlController.update.bind(adminAccessControlController));
router.delete('/access-control/:id', requireSuperAdmin, adminAccessControlController.destroy.bind(adminAccessControlController));
router.get('/access-control', requireSuperAdmin, adminAccessControlController.index.bind(adminAccessControlController));
router.post('/access-control', requireSuperAdmin, adminAccessControlController.create.bind(adminAccessControlController));

// Farm Visit
router.get('/farm-visits/export', requirePermission('farm_visit', 'excel'), adminFarmVisitController.exportRequests.bind(adminFarmVisitController));
router.patch('/farm-visits/:id/reply', requirePermission('farm_visit', 'update'), adminFarmVisitController.reply.bind(adminFarmVisitController));
router.get('/farm-visits', requirePermission('farm_visit', 'view'), adminFarmVisitController.index.bind(adminFarmVisitController));

// Content Pages (About Us, Terms & Conditions, Privacy Policy, ...)
router.get('/content-pages/:id', requirePermission('content_pages', 'view'), adminContentPageController.show.bind(adminContentPageController));
router.patch('/content-pages/:id', requirePermission('content_pages', 'update'), adminContentPageController.update.bind(adminContentPageController));
router.delete('/content-pages/:id', requirePermission('content_pages', 'update'), adminContentPageController.destroy.bind(adminContentPageController));
router.get('/content-pages', requirePermission('content_pages', 'view'), adminContentPageController.index.bind(adminContentPageController));
router.post('/content-pages', requirePermission('content_pages', 'create'), adminContentPageController.create.bind(adminContentPageController));

// Coupons
router.get('/coupons/:id', requirePermission('coupons', 'view'), adminCouponController.show.bind(adminCouponController));
router.patch('/coupons/:id', requirePermission('coupons', 'update'), adminCouponController.update.bind(adminCouponController));
router.delete('/coupons/:id', requirePermission('coupons', 'update'), adminCouponController.destroy.bind(adminCouponController));
router.get('/coupons', requirePermission('coupons', 'view'), adminCouponController.index.bind(adminCouponController));
router.post('/coupons', requirePermission('coupons', 'create'), adminCouponController.create.bind(adminCouponController));

// Referral Plan (singleton)
router.get('/referral-plan', requirePermission('referral_plan', 'view'), adminReferralPlanController.show.bind(adminReferralPlanController));
router.patch('/referral-plan', requirePermission('referral_plan', 'update'), adminReferralPlanController.update.bind(adminReferralPlanController));

// App Images (splash + login screen), each uploaded as a file rather than pasted as a URL
router.get('/app-assets', requirePermission('app_assets', 'view'), adminAppAssetsController.show.bind(adminAppAssetsController));
router.post(
  '/app-assets/:slot',
  requirePermission('app_assets', 'update'),
  appAssetUpload.single('image'),
  adminAppAssetsController.upload.bind(adminAppAssetsController)
);
router.delete('/app-assets/:slot', requirePermission('app_assets', 'update'), adminAppAssetsController.destroy.bind(adminAppAssetsController));

export default router;
