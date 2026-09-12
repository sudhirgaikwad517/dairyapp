import { ProductsSection } from "@/components/ProductsSection";
import { PageHero } from "@/components/layout/PageHero";
import { SiteShell } from "@/components/layout/SiteShell";
import type { ProductCategory } from "@/lib/types";

type ProductsPageClientProps = {
  productCategories: ProductCategory[];
  initialCategory?: string;
  searchQuery?: string;
};

export function ProductsPageClient({ productCategories, initialCategory, searchQuery }: ProductsPageClientProps) {
  return (
    <SiteShell>
      <PageHero
        compact
        eyebrow="Shop"
        title="Our Products"
        subtitle="Fresh A2, Buffalo & High Protein milk — buy once or save with a 30-day subscription."
      />
      <ProductsSection
        productCategories={productCategories}
        initialCategory={initialCategory}
        searchQuery={searchQuery}
        showHeading={false}
      />
    </SiteShell>
  );
}
