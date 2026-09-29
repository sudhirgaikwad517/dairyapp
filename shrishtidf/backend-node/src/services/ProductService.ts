import prisma from '../db/prisma';

/// Curated tags an admin can pin on a product. Kept here (rather than free
/// text) so the app and website can style each one consistently.
export const PRODUCT_BADGES = [
  'Must Try',
  'New',
  'Popular',
  'Best Value',
  'Combo',
  'Seasonal'
];

export class ProductService {
  /// Only products a customer is allowed to see. Inactive products used to leak
  /// into the catalog because nothing filtered on `is_active`.
  private readonly VISIBLE_PRODUCT_WHERE = { is_active: true };

  private readonly PRODUCT_INCLUDE = {
    product_reviews: {
      where: { is_published: true }
    },
    product_variants: true,
    product_cross_sells_product_cross_sells_product_idToproducts: {
      include: {
        products_product_cross_sells_related_product_idToproducts: true
      }
    }
  };

  public async getProductsList() {
    const rows = await prisma.product_categories.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
      include: {
        products: {
          where: this.VISIBLE_PRODUCT_WHERE,
          orderBy: { sort_order: 'asc' },
          include: this.PRODUCT_INCLUDE
        }
      }
    });

    const categories = rows.map((category: any) => this.mapCategory(category));

    return {
      source: 'database',
      data: {
        categories,
        products: this.flattenProducts(categories)
      }
    };
  }

  /// Everything the category screen needs in one round trip: the category
  /// header, its sub-categories (used as filter chips) and its products.
  public async getCategoryWithProducts(categoryId: string, subCategoryId?: string) {
    const category = await prisma.product_categories.findFirst({
      where: { id: categoryId, is_active: true },
      include: {
        products: {
          where: {
            ...this.VISIBLE_PRODUCT_WHERE,
            ...(subCategoryId ? { sub_category_id: subCategoryId } : {})
          },
          orderBy: { sort_order: 'asc' },
          include: this.PRODUCT_INCLUDE
        },
        product_sub_categories: {
          where: { is_active: true },
          orderBy: { sort_order: 'asc' }
        }
      }
    });

    if (!category) return null;

    const products = (category as any).products.map((p: any) => ({
      ...this.mapProductSummary(p),
      categoryId: category.id,
      categoryLabel: category.label
    }));

    // A sub-category with nothing visible in it would be a dead filter chip.
    const subCategoryCounts = new Map<string, number>();
    for (const product of (category as any).products) {
      if (!product.sub_category_id) continue;
      subCategoryCounts.set(
        product.sub_category_id,
        (subCategoryCounts.get(product.sub_category_id) || 0) + 1
      );
    }

    return {
      category: {
        id: category.id,
        label: category.label,
        tile: category.tile,
        imageUrl: (category as any).image_url,
        description: (category as any).description,
        subscriptionNote: (category as any).subscription_note
      },
      subCategories: (category as any).product_sub_categories
        .filter((s: any) => subCategoryId !== undefined || subCategoryCounts.has(s.id))
        .map((s: any) => ({
          id: s.id,
          label: s.label,
          productCount: subCategoryCounts.get(s.id) || 0
        })),
      products,
      total: products.length
    };
  }

  public async getProductById(id: string) {
    const product = await prisma.products.findUnique({
      where: { id },
      include: {
        product_categories: true,
        ...this.PRODUCT_INCLUDE
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

  private mapCategory(category: any) {
    return {
      id: category.id,
      label: category.label,
      tile: category.tile,
      imageUrl: category.image_url,
      subscriptionNote: category.subscription_note,
      productCount: (category.products || []).length,
      items: (category.products || []).map((p: any) => this.mapProductSummary(p))
    };
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

  /// The variant the app should price against: the default one, else the first
  /// app-visible variant. Variants hidden from the app must not set the price.
  private defaultVariant(product: any) {
    const variants = (product.product_variants || []).filter((v: any) => v.app_visibility !== false);
    if (variants.length === 0) return null;
    return variants.find((v: any) => v.is_default) || variants[0];
  }

  /// Older rows store badges as raw uppercase ("POPULAR"). Map them onto the
  /// curated list so every client renders one consistent label.
  private badgeLabel(raw: any) {
    const badge = String(raw || '').trim();
    if (badge === '') return '';
    const match = PRODUCT_BADGES.find(
      (b) => b.toLowerCase().replace(/\s+/g, '') === badge.toLowerCase().replace(/[\s_-]+/g, '')
    );
    return match || badge;
  }

  /// List price, never invented — only a figure the admin actually entered.
  ///
  /// The selling price comes from the variant, so the variant's own ecom MRP
  /// wins; the product-level `mrp` is the fallback for products sold as a
  /// single pack. `discount` is deliberately NOT used to derive one: we don't
  /// know whether it is already baked into the selling price, and guessing
  /// would advertise a discount that may not be real.
  ///
  /// Returns 0 when there is nothing valid to show, which every client reads
  /// as "render only the selling price".
  private listPrice(product: any, variant: any, sellingPrice: number) {
    const variantMrp = Number(variant?.mrp_ecom || 0);
    const mrp = variantMrp > 0 ? variantMrp : Number(product.mrp || 0);
    return mrp > sellingPrice ? mrp : 0;
  }

  private mapProductSummary(product: any) {
    const reviews = product.product_reviews || [];
    const reviewCount = reviews.length;
    const ratingAvg = reviewCount > 0
      ? Number((reviews.reduce((acc: number, r: any) => acc + Number(r.rating), 0) / reviewCount).toFixed(1))
      : 0.0;

    const variant = this.defaultVariant(product);
    const sellingPrice = Number(variant?.buy_once ?? product.buy_once);
    const mrp = this.listPrice(product, variant, sellingPrice);
    const stockQuantity = variant ? Number(variant.stock_quantity ?? 0) : Number(product.stock_quantity || 0);

    return {
      id: product.id,
      name: product.name,
      size: variant?.size_label || product.size,
      buyOnce: sellingPrice,
      // 0 means "no MRP to show" — the client must not draw a strike-through.
      mrp,
      discountPercent: mrp > 0 ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0,
      subscription: Number(variant?.subscription ?? product.subscription),
      badge: this.badgeLabel(product.badge),
      foodType: product.food_type || 'veg',
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
      stockQuantity,
      inStock: stockQuantity > 0,
      isLowStock: stockQuantity > 0 && stockQuantity <= (product.low_stock_threshold || 5),
      subCategoryId: product.sub_category_id || null,
      variants: (product.product_variants || [])
        .filter((v: any) => v.app_visibility !== false)
        .map((v: any) => ({
          id: v.id,
          sku: v.sku,
          sizeLabel: v.size_label,
          buyOnce: Number(v.buy_once),
          mrp: Number(v.mrp_ecom || 0) > Number(v.buy_once) ? Number(v.mrp_ecom) : 0,
          subscription: Number(v.subscription),
          weightGrams: v.weight_grams,
          isDefault: v.is_default,
          stockQuantity: v.stock_quantity,
          inStock: Number(v.stock_quantity ?? 0) > 0
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
