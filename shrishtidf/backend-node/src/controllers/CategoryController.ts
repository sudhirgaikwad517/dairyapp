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
}

export const categoryController = new CategoryController();
