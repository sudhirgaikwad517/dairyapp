import { Router } from 'express';
// Import routers
import productRoutes from './products';
import authRoutes from './auth';
import cartRoutes from './cart';
import orderRoutes from './orders';
import checkoutRoutes from './checkout';
import paymentRoutes from './payments';
import walletRoutes from './wallet';
import subscriptionRoutes from './subscriptions';
import vacationRoutes from './vacations';

// Import standalone controllers
import { categoryController } from '../controllers/CategoryController';
import { leadController } from '../controllers/LeadController';
import { siteContentController } from '../controllers/SiteContentController';
import { bannerController } from '../controllers/BannerController';
import { feedbackController } from '../controllers/FeedbackController';
import { cutoffController } from '../controllers/CutoffController';
import { adminCancelReasonController } from '../controllers/admin/AdminCancelReasonController';
import { notificationController } from '../controllers/NotificationController';
import { farmVisitController } from '../controllers/FarmVisitController';
import { contentPageController } from '../controllers/ContentPageController';
import { couponController } from '../controllers/CouponController';
import { referralController } from '../controllers/ReferralController';
import { adminDeliveryModeController } from '../controllers/admin/AdminDeliveryModeController';
import { billingController } from '../controllers/BillingController';
import { customerAddressController } from '../controllers/CustomerAddressController';
import { appAssetsController } from '../controllers/AppAssetsController';

const router = Router();

router.use('/products', productRoutes);
router.use('/auth', authRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/payments', paymentRoutes);
router.use('/wallet', walletRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/vacations', vacationRoutes);

import deliveryRoutes from './delivery';

// Standalone routes
router.use('/delivery-boy', deliveryRoutes);

router.get('/categories', categoryController.index.bind(categoryController));
router.get('/categories/:id', categoryController.show.bind(categoryController));
router.get('/site-content', siteContentController.index.bind(siteContentController));
router.post('/leads', leadController.create.bind(leadController));
router.get('/banners', bannerController.getBanners.bind(bannerController));
router.post('/feedback', feedbackController.create.bind(feedbackController));
router.get('/cutoff-info', cutoffController.index.bind(cutoffController));
router.get('/cancel-reasons', (req, res) => {
  req.query.activeOnly = 'true';
  return adminCancelReasonController.index(req, res);
});
router.get('/notifications', notificationController.index.bind(notificationController));
router.get('/notifications/unread-count', notificationController.unreadCount.bind(notificationController));
router.patch('/notifications/read-all', notificationController.markAllRead.bind(notificationController));
router.patch('/notifications/:id/read', notificationController.markRead.bind(notificationController));
router.post('/farm-visits', farmVisitController.create.bind(farmVisitController));
router.get('/content-pages', contentPageController.index.bind(contentPageController));
router.get('/content-pages/:slug', contentPageController.show.bind(contentPageController));
router.get('/coupons', couponController.index.bind(couponController));
router.get('/referrals', referralController.index.bind(referralController));
router.get('/delivery-modes', (req, res) => {
  req.query.activeOnly = 'true';
  return adminDeliveryModeController.index(req, res);
});
router.get('/billing', billingController.index.bind(billingController));
router.get('/addresses', customerAddressController.index.bind(customerAddressController));
router.post('/addresses', customerAddressController.create.bind(customerAddressController));
router.patch('/addresses/:id', customerAddressController.update.bind(customerAddressController));
router.delete('/addresses/:id', customerAddressController.destroy.bind(customerAddressController));
router.patch('/addresses/:id/default', customerAddressController.setDefault.bind(customerAddressController));
router.get('/app-assets', appAssetsController.index.bind(appAssetsController));

export default router;
