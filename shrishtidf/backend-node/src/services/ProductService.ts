import prisma from '../db/prisma';

export class ProductService {
  public async getProductsList() {
    const rows = await prisma.product_categories.findMany({
      orderBy: { sort_order: 'asc' },
      include: {
        products: {
          orderBy: { sort_order: 'asc' },
          include: {
            product_reviews: {
              where: { is_published: true }
            },
            product_variants: true,
            product_cross_sells_product_cross_sells_product_idToproducts: {
              include: {
                products_product_cross_sells_related_product_idToproducts: true
              }
            }
          }
        }
      }
    });

    const categories = rows.map((category: any) => {
      return {
        id: category.id,
        label: category.label,
        tile: category.tile,
        imageUrl: category.image_url,
        subscriptionNote: category.subscription_note,
        items: category.products.map((p: any) => this.mapProductSummary(p))
      };
    });

    return {
      source: 'database',
      data: {
        categories,
        products: this.flattenProducts(categories)
      }
    };
  }

  public async getProductById(id: string) {
    const product = await prisma.products.findUnique({
      where: { id },
      include: {
        product_categories: true,
        product_reviews: {
          where: { is_published: true }
        },
        product_variants: true,
        product_cross_sells_product_cross_sells_product_idToproducts: {
          include: {
            products_product_cross_sells_related_product_idToproducts: true
          }
        }
      }
    });

    if (product) {
      return this.mapProductDetail(product);
    }
    return null;
  }

  public async getCategories() {
    const list = await this.getProductsList();
    return list.data.categories.map((category: any) => ({
      id: category.id,
      label: category.label,
      tile: category.tile,
      imageUrl: category.imageUrl,
      subscriptionNote: category.subscriptionNote || '30 days subscription',
      productCount: category.items ? category.items.length : 0
    }));
  }

  public async searchProducts(query: string, limit = 24) {
    const needle = query.trim().toLowerCase();
    if (needle === '') return [];

    const list = await this.getProductsList();
    const matches = [];

    for (const product of list.data.products) {
      const haystack = [
        product.name,
        product.size,
        product.badge,
        product.categoryLabel,
        product.description
      ].filter(Boolean).join(' ').toLowerCase();

      if (haystack.includes(needle)) {
        matches.push(product);
      }
    }

    return matches.slice(0, Math.max(1, Math.min(limit, 50)));
  }

  private flattenProducts(categories: any[]) {
    const products: any[] = [];
    for (const category of categories) {
      for (const item of category.items) {
        products.push({
          ...item,
          categoryId: category.id,
          categoryLabel: category.label
        });
      }
    }
    return products;
  }

  private mapProductSummary(product: any) {
    const reviews = product.product_reviews || [];
    const reviewCount = reviews.length;
    const ratingAvg = reviewCount > 0 
      ? Number((reviews.reduce((acc: number, r: any) => acc + Number(r.rating), 0) / reviewCount).toFixed(1))
      : 0.0;

    return {
      id: product.id,
      name: product.name,
      size: product.size,
      buyOnce: Number(product.buy_once),
      subscription: Number(product.subscription),
      badge: product.badge || '',
      imageUrl: product.image_url,
      description: product.description,
      specifications: typeof product.specifications === 'string' ? JSON.parse(product.specifications) : (product.specifications || []),
      videoUrl: product.video_url,
      videoPoster: product.video_poster,
      ratingAvg,
      reviewCount,
      shelfLifeType: product.shelf_life_type || 'short',
      storageType: product.storage_type || 'chilled',
      gstRate: Number(product.gst_rate || 0),
      allowSubscription: Boolean(product.allow_subscription),
      subscriptionFrequency: product.subscription_frequency,
      stockQuantity: product.stock_quantity || 0,
      isLowStock: (product.stock_quantity || 0) <= (product.low_stock_threshold || 5),
      variants: (product.product_variants || []).map((v: any) => ({
        id: v.id,
        sku: v.sku,
        sizeLabel: v.size_label,
        buyOnce: Number(v.buy_once),
        subscription: Number(v.subscription),
        weightGrams: v.weight_grams,
        isDefault: v.is_default,
        stockQuantity: v.stock_quantity
      }))
    };
  }

  private mapProductDetail(product: any) {
    const summary = this.mapProductSummary(product);
    const reviews = product.product_reviews || [];

    const crossSells = (product.product_cross_sells_product_cross_sells_product_idToproducts || []).map((cs: any) => {
      const related = cs.products_product_cross_sells_related_product_idToproducts;
      return {
        id: related.id,
        name: related.name,
        size: related.size,
        buyOnce: Number(related.buy_once),
        imageUrl: related.image_url
      };
    });

    return {
      ...summary,
      categoryId: product.category_id,
      categoryLabel: product.product_categories?.label || '',
      crossSells,
      reviews: reviews.map((r: any) => ({
        id: r.id,
        customerName: r.customer_name,
        rating: r.rating,
        comment: r.comment || '',
        createdAt: r.created_at
      }))
    };
  }
}

export const productService = new ProductService();
