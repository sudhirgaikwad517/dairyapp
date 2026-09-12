export type PurchaseType = "BUY_ONCE" | "SUBSCRIPTION";

export type ProductDto = {
  id: string;
  categoryId: string;
  categoryLabel: string;
  name: string;
  size: string;
  buyOnce: number;
  subscription: number;
  badge: string;
  imageUrl?: string;
  description?: string;
  specifications?: Record<string, string>;
  videoUrl?: string;
  videoPoster?: string;
  ratingAvg?: number;
  reviewCount?: number;
  reviews?: import("@/lib/types").ProductReview[];
  variants?: import("@/lib/types").ProductVariant[];
  crossSells?: import("@/lib/types").ProductItem["crossSells"];
  allowSubscription?: boolean;
};

export type CategoryDto = Omit<import("@/lib/types").ProductCategory, "items"> & {
  productCount: number;
};

export type ProductsListData = {
  categories: import("@/lib/types").ProductCategory[];
  products: ProductDto[];
};

export type ContactDto = {
  phones: string[];
  address: string;
  businessName: string;
};

export type HealthData = {
  status: "ok";
  database: "connected" | "fallback";
};

export type CartItemDto = {
  id: string;
  productId: string;
  name: string;
  size: string;
  categoryLabel: string;
  badge: string;
  quantity: number;
  purchaseType: PurchaseType;
  unitPrice: number;
  lineTotal: number;
};

export type CartDto = {
  id: string;
  sessionId: string;
  items: CartItemDto[];
  itemCount: number;
  totalAmount: number;
};

export type OrderItemDto = {
  id: string;
  productId: string;
  productName: string;
  size: string;
  quantity: number;
  unitPrice: number;
  purchaseType: PurchaseType;
  lineTotal: number;
};

export type OrderDto = {
  id: string;
  status: string;
  totalAmount: number;
  customerName: string;
  phone: string;
  address: string;
  items: OrderItemDto[];
  createdAt: string;
};

export type AddToCartInput = {
  productId: string;
  purchaseType?: PurchaseType;
  quantity?: number;
};

export type CreateOrderInput = {
  customerName: string;
  phone: string;
  address: string;
};
