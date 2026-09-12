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
  weightGrams?: number;
  isDefault?: boolean;
  stockQuantity?: number;
};

export type ProductItem = {
  id: string;
  name: string;
  size: string;
  buyOnce: number;
  subscription: number;
  badge: string;
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
  items: ProductItem[];
};
