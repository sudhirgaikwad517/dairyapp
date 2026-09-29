import { Router } from 'express';
import { customerAuthController } from '../controllers/CustomerAuthController';
import { otpSendLimiter, otpVerifyLimiter } from '../middleware/rateLimiters';

const router = Router();

router.post('/otp/send', otpSendLimiter, customerAuthController.sendOtp.bind(customerAuthController));
router.post('/otp/verify', otpVerifyLimiter, customerAuthController.verifyOtp.bind(customerAuthController));
router.post('/login', otpVerifyLimiter, customerAuthController.loginWithPassword.bind(customerAuthController));
router.post('/signup', otpVerifyLimiter, customerAuthController.signUpWithPassword.bind(customerAuthController));

router.get('/me', customerAuthController.me.bind(customerAuthController));
router.patch('/profile', customerAuthController.updateProfile.bind(customerAuthController));
router.post('/logout', customerAuthController.logout.bind(customerAuthController));

export default router;
