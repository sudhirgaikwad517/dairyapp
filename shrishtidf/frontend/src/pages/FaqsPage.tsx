import { Link } from "react-router-dom";

import { FaqList } from "@/components/FaqList";
import { ContentCard } from "@/components/layout/ContentCard";
import { PageHero } from "@/components/layout/PageHero";
import { SiteShell } from "@/components/layout/SiteShell";
import { FAQ_ITEMS } from "@/lib/page-content";

export function FaqsPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Help Centre"
        title="Frequently Asked Questions"
        subtitle="Everything you need to know about our milk, delivery, and subscriptions."
      />
      <div className="mx-auto max-w-3xl px-4 py-12 space-y-6">
        <ContentCard>
          <FaqList items={FAQ_ITEMS} />
        </ContentCard>
        <p className="text-center text-sm text-muted-foreground">
          Still have questions?{" "}
          <Link to="/contact" className="text-primary font-semibold hover:underline">
            Contact us
          </Link>{" "}
          or visit our{" "}
          <Link to="/help" className="text-primary font-semibold hover:underline">
            Help page
          </Link>
          .
        </p>
      </div>
    </SiteShell>
  );
}
