import { Router } from 'express';
import { cartController } from '../controllers/CartController';

const router = Router();

router.get('/', cartController.show.bind(cartController));
router.post('/items', cartController.store.bind(cartController));
router.delete('/', cartController.destroy.bind(cartController));

export default router;
