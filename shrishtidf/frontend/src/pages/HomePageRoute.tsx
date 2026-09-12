import { HomePage } from "@/components/HomePage";
import { useProductCatalog } from "@/hooks/use-product-catalog";

export function HomePageRoute() {
  const { categories, loading } = useProductCatalog();

  if (loading) {
    return (
      <div className="min-h-screen milk-page-bg flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return <HomePage productCategories={categories} />;
}
