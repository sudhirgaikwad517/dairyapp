import { Request, Response } from 'express';
import { productService } from '../services/ProductService';

export class CategoryController {
  public async index(req: Request, res: Response) {
    try {
      const categories = await productService.getCategories();

      res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      return res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  /// Category header + sub-category chips + products, for the category screen.
  public async show(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const subCategoryId = typeof req.query.subCategory === 'string' && req.query.subCategory !== ''
        ? req.query.subCategory
        : undefined;

      const result = await productService.getCategoryWithProducts(id, subCategoryId);

      if (!result) {
        return res.status(404).json({
          success: false,
          errorCode: 'NOT_FOUND',
          message: 'Category not found'
        });
      }

      res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

export const categoryController = new CategoryController();
