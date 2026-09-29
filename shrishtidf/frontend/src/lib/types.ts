export type ProductReview = {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt?: string;
};

export type ProductVariant = {
  id: string;
  sku: string;
  sizeLabel: string;
  buyOnce: number;
  subscription: number;
  /** List price. 0 means there is none — never draw a struck-through price then. */
  mrp?: number;
  weightGrams?: number;
  isDefault?: boolean;
  stockQuantity?: number;
  inStock?: boolean;
};

export type ProductItem = {
  id: string;
  name: string;
  size: string;
  buyOnce: number;
  subscription: number;
  /**
   * The list price the admin actually entered. 0 means there is none, and the
   * UI must show only the selling price — showing an invented "original" price
   * is a fake discount.
   */
  mrp?: number;
  discountPercent?: number;
  /** One of "Must Try" | "New" | "Popular" | "Best Value" | "Combo" | "Seasonal", or "". */
  badge: string;
  /** "veg" | "non_veg" — drives the FSSAI mark. */
  foodType?: string;
  inStock?: boolean;
  stockQuantity?: number;
  subCategoryId?: string | null;
  imageUrl?: string;
  description?: string;
  specifications?: Record<string, string> | Array<{ key?: string; value?: string }> | string[];
  videoUrl?: string;
  videoPoster?: string;
  ratingAvg?: number;
  reviewCount?: number;
  reviews?: ProductReview[];
  categoryId?: string;
  categoryLabel?: string;
  shelfLifeType?: string;
  storageType?: string;
  gstRate?: number;
  allowSubscription?: boolean;
  subscriptionFrequency?: string;
  variants?: ProductVariant[];
  crossSells?: { id: string; name: string; size: string; buyOnce: number; imageUrl?: string }[];
};

export type ProductCategory = {
  id: string;
  label: string;
  tile: string;
  subscriptionNote: string;
  imageUrl?: string;
  description?: string;
  productCount?: number;
  items: ProductItem[];
};

export type ProductSubCategory = {
  id: string;
  label: string;
  productCount: number;
};

/** Payload of GET /categories/:id — everything the category page renders. */
export type CategoryDetail = {
  category: Pick<ProductCategory, "id" | "label" | "tile" | "subscriptionNote"> & {
    imageUrl?: string;
    description?: string;
  };
  subCategories: ProductSubCategory[];
  products: ProductItem[];
  total: number;
};
