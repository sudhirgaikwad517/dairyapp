import { Router } from 'express';
import { deliveryBoyAuthController } from '../controllers/delivery/DeliveryBoyAuthController';
import { deliveryBoyRunController } from '../controllers/delivery/DeliveryBoyRunController';
import { authenticateDeliveryBoy } from '../middleware/deliveryAuth';

const router = Router();

// Auth Routes (Public)
router.post('/login', deliveryBoyAuthController.login.bind(deliveryBoyAuthController));

// Protected Routes
router.use(authenticateDeliveryBoy);

router.get('/me', deliveryBoyAuthController.me.bind(deliveryBoyAuthController));
router.post('/logout', deliveryBoyAuthController.logout.bind(deliveryBoyAuthController));

// Delivery Run Routes
router.get('/run', deliveryBoyRunController.getDailyRun.bind(deliveryBoyRunController));
router.patch('/run/:recordId/mark', deliveryBoyRunController.markDelivery.bind(deliveryBoyRunController));
router.get('/upload-url', deliveryBoyRunController.getUploadUrl.bind(deliveryBoyRunController));

export default router;
