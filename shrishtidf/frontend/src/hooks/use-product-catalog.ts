import { useEffect, useState } from "react";

import { getProductCategories } from "@/lib/services/product.service";
import { DEFAULT_PRODUCT_CATEGORIES } from "@/lib/site-data";
import type { ProductCategory } from "@/lib/types";

export function useProductCatalog() {
  const [categories, setCategories] = useState<ProductCategory[]>(DEFAULT_PRODUCT_CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getProductCategories()
      .then((data) => {
        if (active && data.length > 0) setCategories(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { categories, loading };
}
