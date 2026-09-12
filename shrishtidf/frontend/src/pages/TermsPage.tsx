import { ContentCard, MarkdownText } from "@/components/layout/ContentCard";
import { PageHero } from "@/components/layout/PageHero";
import { SiteShell } from "@/components/layout/SiteShell";
import { TERMS_CONDITIONS } from "@/lib/page-content";

export function TermsPage() {
  return (
    <SiteShell>
      <PageHero title="Terms & Conditions" subtitle="Last updated: June 2026" />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ContentCard>
          <MarkdownText text={TERMS_CONDITIONS} />
        </ContentCard>
      </div>
    </SiteShell>
  );
}
