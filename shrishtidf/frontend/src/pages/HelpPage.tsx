import { Link } from "react-router-dom";

import { ContentCard } from "@/components/layout/ContentCard";
import { PageHero } from "@/components/layout/PageHero";
import { SiteShell } from "@/components/layout/SiteShell";
import { HELP_TOPICS } from "@/lib/page-content";

export function HelpPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Support"
        title="Help Centre"
        subtitle="Guides for ordering, subscriptions, delivery, and getting support."
      />
      <div className="mx-auto max-w-3xl px-4 py-12 space-y-4">
        {HELP_TOPICS.map((topic) => (
          <ContentCard key={topic.title}>
            <h2 className="font-display text-lg font-bold text-foreground">{topic.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{topic.body}</p>
          </ContentCard>
        ))}
        <p className="text-center text-sm text-muted-foreground pt-4">
          Need more help?{" "}
          <Link to="/contact" className="text-primary font-semibold hover:underline">
            Contact us
          </Link>{" "}
          or{" "}
          <Link to="/faqs" className="text-primary font-semibold hover:underline">
            browse FAQs
          </Link>
          .
        </p>
      </div>
    </SiteShell>
  );
}
