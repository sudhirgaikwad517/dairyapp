import type { CustomerProfile } from "@/lib/api/auth";
import type { ProductItem, ProductVariant } from "@/lib/types";

export function getDefaultVariant(product: ProductItem): ProductVariant | null {
  if (!product.variants?.length) return null;
  return product.variants.find((v) => v.isDefault) ?? product.variants[0] ?? null;
}

export function productDisplayPrices(product: ProductItem): {
  buyOnce: number;
  subscription: number;
  size: string;
  variantId?: string;
  /** 0 when there is no real MRP — the caller must not render a strike-through. */
  mrp: number;
  discountPercent: number;
} {
  const variant = getDefaultVariant(product);
  const buyOnce = variant ? variant.buyOnce : product.buyOnce;

  // Only a price the admin actually entered counts as an MRP. Deriving one
  // (price x some multiplier) would advertise a discount that isn't real.
  const candidate = Math.max(variant?.mrp ?? 0, product.mrp ?? 0);
  const mrp = candidate > buyOnce ? candidate : 0;

  return {
    buyOnce,
    subscription: variant ? variant.subscription : product.subscription,
    size: variant ? variant.sizeLabel : product.size,
    variantId: variant?.id,
    mrp,
    discountPercent: mrp > 0 ? Math.round(((mrp - buyOnce) / mrp) * 100) : 0,
  };
}

/** Products default to sellable when the API predates the `inStock` field. */
export function isProductInStock(product: ProductItem): boolean {
  return product.inStock !== false;
}

export function isVegProduct(product: ProductItem): boolean {
  return product.foodType !== "non_veg";
}

export function formatCustomerAddress(customer: CustomerProfile): string {
  if (customer.address?.trim()) {
    return customer.address.trim();
  }

  const parts = [
    customer.flatNo ? `Flat/House ${customer.flatNo}` : null,
    customer.societyName ? `Society ${customer.societyName}` : null,
    customer.streetName ? `Street ${customer.streetName}` : null,
    customer.landmark ? `Landmark ${customer.landmark}` : null,
    customer.city,
    customer.state,
    customer.pincode ? `PIN ${customer.pincode}` : null,
  ].filter((part): part is string => Boolean(part && part.trim()));

  return parts.join(", ");
}
