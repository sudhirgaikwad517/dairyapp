import { Router } from 'express';
import { productController } from '../controllers/ProductController';
import { categoryController } from '../controllers/CategoryController';

const router = Router();

router.get('/', productController.index.bind(productController));
router.get('/:id', productController.show.bind(productController));

// Note: In Laravel, /categories was a separate top-level route in api.php.
// We should expose it on index.ts as well, but we can temporarily export it here or wire it up in index.ts directly.

export default router;
