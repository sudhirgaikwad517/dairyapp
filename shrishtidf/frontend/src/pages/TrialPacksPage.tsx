import { OfferGrid } from "@/components/OfferGrid";
import { PageHero } from "@/components/layout/PageHero";
import { SiteShell } from "@/components/layout/SiteShell";
import { useCategoryProducts } from "@/hooks/use-category-products";
import { TRIAL_PACKS } from "@/lib/page-content";

const TRIAL_PRODUCT_IDS = ["trial-a2-3day", "trial-buffalo-3day", "trial-protein-sampler"];

export function TrialPacksPage() {
  const { products, loading } = useCategoryProducts("trial-packs");

  const items = TRIAL_PACKS.map((pack, index) => ({
    ...pack,
    productId: TRIAL_PRODUCT_IDS[index],
  }));

  return (
    <SiteShell>
      <PageHero
        eyebrow="Try Before You Subscribe"
        title="Trial Packs"
        subtitle="Sample our freshest milk with short trial packs — perfect for first-time customers."
      />
      <div className="mx-auto max-w-6xl px-4 py-12">
        {loading ? (
          <p className="text-center text-muted-foreground">Loading trial packs…</p>
        ) : (
          <OfferGrid items={items} products={products} />
        )}
      </div>
    </SiteShell>
  );
}
