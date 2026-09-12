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
} {
  const variant = getDefaultVariant(product);
  if (variant) {
    return {
      buyOnce: variant.buyOnce,
      subscription: variant.subscription,
      size: variant.sizeLabel,
      variantId: variant.id,
    };
  }

  return {
    buyOnce: product.buyOnce,
    subscription: product.subscription,
    size: product.size,
  };
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
