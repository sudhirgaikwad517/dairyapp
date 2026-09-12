import { Router } from 'express';
import { checkoutController } from '../controllers/CheckoutController';

const router = Router();

router.get('/options', checkoutController.options.bind(checkoutController));
router.post('/validate-pincode', checkoutController.validatePincode.bind(checkoutController));
router.post('/quote', checkoutController.quote.bind(checkoutController));
router.post('/place', checkoutController.place.bind(checkoutController));

export default router;
