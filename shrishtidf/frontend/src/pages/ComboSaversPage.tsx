import { OfferGrid } from "@/components/OfferGrid";
import { PageHero } from "@/components/layout/PageHero";
import { SiteShell } from "@/components/layout/SiteShell";
import { useCategoryProducts } from "@/hooks/use-category-products";
import { COMBO_OFFERS } from "@/lib/page-content";

const COMBO_PRODUCT_IDS = ["combo-family-a2", "combo-protein-power", "combo-mixed-monthly"];

export function ComboSaversPage() {
  const { products, loading } = useCategoryProducts("combo-savers");

  const items = COMBO_OFFERS.map((offer, index) => ({
    ...offer,
    productId: COMBO_PRODUCT_IDS[index],
  }));

  return (
    <SiteShell>
      <PageHero
        eyebrow="Bundle & Save"
        title="Combo Savers"
        subtitle="Family packs and mixed milk combos at better value — order online or call us to customise."
      />
      <div className="mx-auto max-w-6xl px-4 py-12">
        {loading ? (
          <p className="text-center text-muted-foreground">Loading combo offers…</p>
        ) : (
          <OfferGrid items={items} products={products} />
        )}
      </div>
    </SiteShell>
  );
}
