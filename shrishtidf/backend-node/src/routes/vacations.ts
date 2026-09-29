import { Router } from 'express';
import { vacationController } from '../controllers/VacationController';

const router = Router();
router.get('/', vacationController.index.bind(vacationController));
router.post('/', vacationController.create.bind(vacationController));
router.post('/:id/cancel', vacationController.cancel.bind(vacationController));

export default router;
