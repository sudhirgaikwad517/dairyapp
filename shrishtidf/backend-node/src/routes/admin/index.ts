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

import { adminAuthController } from '../../controllers/admin/AdminAuthController';

const router = Router();

// Auth
router.post('/login', adminAuthController.login.bind(adminAuthController));

// Stats
router.get('/dashboard', adminStatsController.getDashboardStats.bind(adminStatsController));
router.patch('/alerts/:id/dismiss', adminStatsController.dismissAlert.bind(adminStatsController));

// Orders
router.get('/orders', adminOrderController.index.bind(adminOrderController));
router.patch('/orders/:id/status', adminOrderController.updateStatus.bind(adminOrderController));

// Catalog
router.get('/products/export', adminProductController.exportProducts.bind(adminProductController));
router.get('/products/sub-categories', adminProductController.getSubCategories.bind(adminProductController));
router.get('/products/:id', adminProductController.getProduct.bind(adminProductController));
router.patch('/products/:id', adminProductController.updateProduct.bind(adminProductController));
router.get('/products', adminProductController.getProducts.bind(adminProductController));
router.post('/products', adminProductController.createProduct.bind(adminProductController));
router.get('/categories', adminProductController.getCategories.bind(adminProductController));

// Product Categories (full management)
router.get('/product-categories/export', adminCategoryController.exportCategories.bind(adminCategoryController));
router.get('/product-categories/:id', adminCategoryController.show.bind(adminCategoryController));
router.patch('/product-categories/:id', adminCategoryController.update.bind(adminCategoryController));
router.get('/product-categories', adminCategoryController.index.bind(adminCategoryController));
router.post('/product-categories', adminCategoryController.create.bind(adminCategoryController));

// Product Sub Categories (full management)
router.get('/product-sub-categories/export', adminSubCategoryController.exportSubCategories.bind(adminSubCategoryController));
router.get('/product-sub-categories/:id', adminSubCategoryController.show.bind(adminSubCategoryController));
router.patch('/product-sub-categories/:id', adminSubCategoryController.update.bind(adminSubCategoryController));
router.get('/product-sub-categories', adminSubCategoryController.index.bind(adminSubCategoryController));
router.post('/product-sub-categories', adminSubCategoryController.create.bind(adminSubCategoryController));

// Customers & Subscriptions
router.get('/customers/export', adminCustomerController.exportCustomers.bind(adminCustomerController));
router.get('/customers/:id', adminCustomerController.getCustomer.bind(adminCustomerController));
router.patch('/customers/:id', adminCustomerController.updateCustomer.bind(adminCustomerController));
router.get('/customers', adminCustomerController.getCustomers.bind(adminCustomerController));
router.post('/customers', adminCustomerController.createCustomer.bind(adminCustomerController));
router.get('/subscriptions', adminCustomerController.getSubscriptions.bind(adminCustomerController));

// Masters (hubs, routes, delivery boys) — used by the Customer tab's dropdowns
router.get('/hubs/:id', adminHubController.show.bind(adminHubController));
router.patch('/hubs/:id', adminHubController.update.bind(adminHubController));
router.get('/hubs', adminHubController.index.bind(adminHubController));
router.post('/hubs', adminHubController.create.bind(adminHubController));
router.get('/routes', adminLogisticsController.getRoutes.bind(adminLogisticsController));
router.get('/delivery-boys', adminLogisticsController.getDeliveryBoys.bind(adminLogisticsController));

// Logistics — Delivery Area / Sub Area / Apartment
router.get('/logistics/delivery-areas/export', adminDeliveryAreaController.exportAreas.bind(adminDeliveryAreaController));
router.get('/logistics/delivery-areas/:id', adminDeliveryAreaController.show.bind(adminDeliveryAreaController));
router.patch('/logistics/delivery-areas/:id', adminDeliveryAreaController.update.bind(adminDeliveryAreaController));
router.get('/logistics/delivery-areas', adminDeliveryAreaController.index.bind(adminDeliveryAreaController));
router.post('/logistics/delivery-areas', adminDeliveryAreaController.create.bind(adminDeliveryAreaController));

router.get('/logistics/sub-areas/export', adminSubAreaController.exportSubAreas.bind(adminSubAreaController));
router.get('/logistics/sub-areas/:id', adminSubAreaController.show.bind(adminSubAreaController));
router.patch('/logistics/sub-areas/:id', adminSubAreaController.update.bind(adminSubAreaController));
router.get('/logistics/sub-areas', adminSubAreaController.index.bind(adminSubAreaController));
router.post('/logistics/sub-areas', adminSubAreaController.create.bind(adminSubAreaController));

router.get('/logistics/apartments/export', adminApartmentController.exportApartments.bind(adminApartmentController));
router.get('/logistics/apartments/:id', adminApartmentController.show.bind(adminApartmentController));
router.patch('/logistics/apartments/:id', adminApartmentController.update.bind(adminApartmentController));
router.get('/logistics/apartments', adminApartmentController.index.bind(adminApartmentController));
router.post('/logistics/apartments', adminApartmentController.create.bind(adminApartmentController));

// Logistics — Route (full management; distinct from the lite /routes dropdown above)
router.get('/logistics/routes/export', adminRouteController.exportRoutes.bind(adminRouteController));
router.get('/logistics/routes/:id', adminRouteController.show.bind(adminRouteController));
router.patch('/logistics/routes/:id', adminRouteController.update.bind(adminRouteController));
router.get('/logistics/routes', adminRouteController.index.bind(adminRouteController));
router.post('/logistics/routes', adminRouteController.create.bind(adminRouteController));

// Logistics — Delivery Boy (full management; distinct from the lite /delivery-boys dropdown above)
router.get('/logistics/delivery-boys/export', adminDeliveryBoyController.exportDeliveryBoys.bind(adminDeliveryBoyController));
router.get('/logistics/delivery-boys/:id', adminDeliveryBoyController.show.bind(adminDeliveryBoyController));
router.patch('/logistics/delivery-boys/:id', adminDeliveryBoyController.update.bind(adminDeliveryBoyController));
router.get('/logistics/delivery-boys', adminDeliveryBoyController.index.bind(adminDeliveryBoyController));
router.post('/logistics/delivery-boys', adminDeliveryBoyController.create.bind(adminDeliveryBoyController));

// Logistics — Mark Daily Delivery
router.get('/logistics/daily-deliveries', adminDailyDeliveryController.index.bind(adminDailyDeliveryController));
router.post('/logistics/daily-deliveries', adminDailyDeliveryController.save.bind(adminDailyDeliveryController));
router.post('/logistics/daily-deliveries/:id/unmark', adminDailyDeliveryController.unmark.bind(adminDailyDeliveryController));

// Logistics & Inventory
router.get('/inventory', adminLogisticsController.getInventory.bind(adminLogisticsController));
router.get('/zones', adminLogisticsController.getZones.bind(adminLogisticsController));
router.get('/dispatch', adminLogisticsController.getDispatchSheet.bind(adminLogisticsController));

// Leads
router.get('/leads', adminLeadController.index.bind(adminLeadController));
router.patch('/leads/:id/status', adminLeadController.updateStatus.bind(adminLeadController));

// Banners (full management)
router.get('/banners/export', adminBannerController.exportBanners.bind(adminBannerController));
router.get('/banners/:id', adminBannerController.show.bind(adminBannerController));
router.patch('/banners/:id', adminBannerController.update.bind(adminBannerController));
router.delete('/banners/:id', adminBannerController.remove.bind(adminBannerController));
router.get('/banners', adminBannerController.index.bind(adminBannerController));
router.post('/banners', adminBannerController.create.bind(adminBannerController));

// Cut Off Time
router.get('/cutoff-time', adminCutoffController.show.bind(adminCutoffController));
router.patch('/cutoff-time', adminCutoffController.update.bind(adminCutoffController));

// Staff Type
router.get('/staff-types/:id', adminStaffTypeController.show.bind(adminStaffTypeController));
router.patch('/staff-types/:id', adminStaffTypeController.update.bind(adminStaffTypeController));
router.get('/staff-types', adminStaffTypeController.index.bind(adminStaffTypeController));
router.post('/staff-types', adminStaffTypeController.create.bind(adminStaffTypeController));

// Office Staff
router.get('/office-staff/export', adminOfficeStaffController.exportStaff.bind(adminOfficeStaffController));
router.get('/office-staff/:id', adminOfficeStaffController.show.bind(adminOfficeStaffController));
router.patch('/office-staff/:id', adminOfficeStaffController.update.bind(adminOfficeStaffController));
router.get('/office-staff', adminOfficeStaffController.index.bind(adminOfficeStaffController));
router.post('/office-staff', adminOfficeStaffController.create.bind(adminOfficeStaffController));

// Delivery Mode
router.get('/delivery-modes/:id', adminDeliveryModeController.show.bind(adminDeliveryModeController));
router.patch('/delivery-modes/:id', adminDeliveryModeController.update.bind(adminDeliveryModeController));
router.get('/delivery-modes', adminDeliveryModeController.index.bind(adminDeliveryModeController));
router.post('/delivery-modes', adminDeliveryModeController.create.bind(adminDeliveryModeController));

// Delivery Charge
router.get('/delivery-charges/:id', adminDeliveryChargeController.show.bind(adminDeliveryChargeController));
router.patch('/delivery-charges/:id', adminDeliveryChargeController.update.bind(adminDeliveryChargeController));
router.delete('/delivery-charges/:id', adminDeliveryChargeController.remove.bind(adminDeliveryChargeController));
router.get('/delivery-charges', adminDeliveryChargeController.index.bind(adminDeliveryChargeController));
router.post('/delivery-charges', adminDeliveryChargeController.create.bind(adminDeliveryChargeController));

// Email Terms & Conditions (singleton)
router.get('/email-terms', adminEmailTermsController.show.bind(adminEmailTermsController));
router.patch('/email-terms', adminEmailTermsController.update.bind(adminEmailTermsController));

// Cancel Reason
router.get('/cancel-reasons/export', adminCancelReasonController.exportReasons.bind(adminCancelReasonController));
router.get('/cancel-reasons/:id', adminCancelReasonController.show.bind(adminCancelReasonController));
router.patch('/cancel-reasons/:id', adminCancelReasonController.update.bind(adminCancelReasonController));
router.get('/cancel-reasons', adminCancelReasonController.index.bind(adminCancelReasonController));
router.post('/cancel-reasons', adminCancelReasonController.create.bind(adminCancelReasonController));

export default router;
