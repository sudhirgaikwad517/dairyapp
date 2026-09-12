import { Request, Response } from 'express';
import { productService } from '../services/ProductService';

export class ProductController {
  public async index(req: Request, res: Response) {
    try {
      const list = await productService.getProductsList();
      const categoryId = req.query.category as string;
      const searchQuery = req.query.q as string;

      let productList = list.data.products;

      if (typeof searchQuery === 'string' && searchQuery.trim() !== '') {
        productList = await productService.searchProducts(searchQuery);
      } else if (typeof categoryId === 'string' && categoryId !== '') {
        productList = productList.filter((product: any) => product.categoryId === categoryId);
      }

      res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      return res.status(200).json({
        success: true,
        data: {
          categories: list.data.categories,
          products: productList,
          source: list.source
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  public async show(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const product = await productService.getProductById(id);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          errorCode: 'NOT_FOUND',
          message: 'Product not found'
        });
      }

      res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      return res.status(200).json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

export const productController = new ProductController();
