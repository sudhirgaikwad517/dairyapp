import { Router } from 'express';
import { paymentController } from '../controllers/PaymentController';

const router = Router();

router.get('/razorpay/status', paymentController.status.bind(paymentController));
router.post('/razorpay/order', paymentController.createRazorpayOrder.bind(paymentController));
router.post('/razorpay/wallet-order', paymentController.createWalletTopUpOrder.bind(paymentController));
router.post('/razorpay/subscription-order', paymentController.createSubscriptionOrder.bind(paymentController));
router.post('/razorpay/verify', paymentController.verifyRazorpayPayment.bind(paymentController));

export default router;
