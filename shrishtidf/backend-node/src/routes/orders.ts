import { Router } from 'express';
import { orderController } from '../controllers/OrderController';

const router = Router();
router.post('/', orderController.store.bind(orderController));
router.get('/:id/invoice', orderController.invoiceHtml.bind(orderController));
router.get('/:id', orderController.show.bind(orderController));

export default router;
