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

// Import standalone controllers
import { categoryController } from '../controllers/CategoryController';
import { leadController } from '../controllers/LeadController';
import { siteContentController } from '../controllers/SiteContentController';
import { bannerController } from '../controllers/BannerController';
import { feedbackController } from '../controllers/FeedbackController';
import { cutoffController } from '../controllers/CutoffController';
import { adminCancelReasonController } from '../controllers/admin/AdminCancelReasonController';

const router = Router();

router.use('/products', productRoutes);
router.use('/auth', authRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/payments', paymentRoutes);
router.use('/wallet', walletRoutes);
router.use('/subscriptions', subscriptionRoutes);

// Standalone routes
router.get('/categories', categoryController.index.bind(categoryController));
router.get('/site-content', siteContentController.index.bind(siteContentController));
router.post('/leads', leadController.create.bind(leadController));
router.get('/banners', bannerController.getBanners.bind(bannerController));
router.post('/feedback', feedbackController.create.bind(feedbackController));
router.get('/cutoff-info', cutoffController.index.bind(cutoffController));
router.get('/cancel-reasons', (req, res) => {
  req.query.activeOnly = 'true';
  return adminCancelReasonController.index(req, res);
});

export default router;
