import { useEffect, useState } from "react";

import { apiUrl, fetchOptions } from "@/lib/api/client";
import type { ApiResponse } from "@/lib/api/response";
import { API_ROUTES } from "@/lib/api/response";
import type { ProductItem } from "@/lib/types";

export async function fetchProductsByCategory(categoryId: string): Promise<ProductItem[]> {
  try {
    const res = await fetch(apiUrl(`${API_ROUTES.products}?category=${encodeURIComponent(categoryId)}`), {
      ...fetchOptions,
    });
    const json = (await res.json()) as ApiResponse<{ products: ProductItem[] }>;
    return json.success ? json.data.products : [];
  } catch {
    return [];
  }
}

export function useCategoryProducts(categoryId: string) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchProductsByCategory(categoryId).then((items) => {
      if (!active) return;
      setProducts(items);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [categoryId]);

  return { products, loading };
}
