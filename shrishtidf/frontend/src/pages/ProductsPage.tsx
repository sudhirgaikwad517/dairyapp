import { useSearchParams } from "react-router-dom";

import { ProductsPageClient } from "@/components/ProductsPageClient";
import { useProductCatalog } from "@/hooks/use-product-catalog";

export function ProductsPage() {
  const [searchParams] = useSearchParams();
  const { categories, loading } = useProductCatalog();
  const initialCategory = searchParams.get("category") ?? undefined;
  const searchQuery = searchParams.get("q") ?? undefined;

  if (loading) {
    return (
      <div className="min-h-screen milk-page-bg flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <ProductsPageClient
      productCategories={categories}
      initialCategory={initialCategory}
      searchQuery={searchQuery}
    />
  );
}
