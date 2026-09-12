import { Router } from 'express';
import { customerAuthController } from '../controllers/CustomerAuthController';

const router = Router();

router.post('/otp/send', customerAuthController.sendOtp.bind(customerAuthController));
router.post('/otp/verify', customerAuthController.verifyOtp.bind(customerAuthController));
router.get('/me', customerAuthController.me.bind(customerAuthController));
router.patch('/profile', customerAuthController.updateProfile.bind(customerAuthController));
router.post('/logout', customerAuthController.logout.bind(customerAuthController));

export default router;
