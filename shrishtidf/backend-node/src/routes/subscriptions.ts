import { Router } from 'express';
import { subscriptionController } from '../controllers/SubscriptionController';

const router = Router();
router.get('/', subscriptionController.index.bind(subscriptionController));
router.get('/upcoming', subscriptionController.upcoming.bind(subscriptionController));
router.get('/history', subscriptionController.history.bind(subscriptionController));
router.post('/quote', subscriptionController.quote.bind(subscriptionController));
router.post('/', subscriptionController.store.bind(subscriptionController));
router.post('/:id/pause', subscriptionController.pause.bind(subscriptionController));
router.post('/:id/resume', subscriptionController.resume.bind(subscriptionController));
router.post('/:id/cancel', subscriptionController.cancel.bind(subscriptionController));
router.post('/:id/change-request', subscriptionController.requestChange.bind(subscriptionController));

export default router;
