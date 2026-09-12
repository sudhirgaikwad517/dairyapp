import { TrackOrderPanel } from "@/components/TrackOrderPanel";
import { PageHero } from "@/components/layout/PageHero";
import { SiteShell } from "@/components/layout/SiteShell";

export function TrackOrderPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Orders"
        title="Track Your Order"
        subtitle="Enter the order ID from your confirmation to see status and items."
      />
      <div className="mx-auto max-w-2xl px-4 py-12">
        <TrackOrderPanel />
      </div>
    </SiteShell>
  );
}
