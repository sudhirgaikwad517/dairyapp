import { ContentCard, MarkdownText } from "@/components/layout/ContentCard";
import { PageHero } from "@/components/layout/PageHero";
import { SiteShell } from "@/components/layout/SiteShell";
import { PRIVACY_POLICY } from "@/lib/page-content";

export function PrivacyPolicyPage() {
  return (
    <SiteShell>
      <PageHero title="Privacy Policy" subtitle="Last updated: June 2026" />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ContentCard>
          <MarkdownText text={PRIVACY_POLICY} />
        </ContentCard>
      </div>
    </SiteShell>
  );
}
