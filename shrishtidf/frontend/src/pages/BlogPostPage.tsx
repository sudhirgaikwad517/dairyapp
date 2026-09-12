import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

import { ContentCard, MarkdownText } from "@/components/layout/ContentCard";
import { PageHero } from "@/components/layout/PageHero";
import { SiteShell } from "@/components/layout/SiteShell";
import { fetchBlogPost, type BlogPostDetail } from "@/lib/api/content";
import { BLOG_POSTS } from "@/lib/page-content";

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPostDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fallback = BLOG_POSTS.find((entry) => entry.slug === slug);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    fetchBlogPost(slug).then((data) => {
      if (!active) return;
      if (data) {
        setPost(data);
      } else {
        const local = BLOG_POSTS.find((entry) => entry.slug === slug);
        if (local) {
          setPost({
            slug: local.slug,
            title: local.title,
            excerpt: local.excerpt,
            date: local.date,
            body: local.excerpt,
          });
        }
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [slug]);

  if (!slug) {
    return <Navigate to="/blog" replace />;
  }

  if (!loading && !post && !fallback) {
    return <Navigate to="/blog" replace />;
  }

  const view = post ?? (fallback
    ? {
        slug: fallback.slug,
        title: fallback.title,
        excerpt: fallback.excerpt,
        date: fallback.date,
        body: fallback.excerpt,
      }
    : null);

  if (!view) {
    return (
      <SiteShell>
        <div className="min-h-[40vh] grid place-items-center text-muted-foreground">Loading…</div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <PageHero title={view.title} subtitle={view.excerpt} />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ContentCard>
          <MarkdownText
            text={`**Published:** ${new Date(view.date).toLocaleDateString("en-IN")}

${view.body || view.excerpt}`}
          />
          <Link to="/blog" className="inline-block mt-8 text-sm font-semibold text-primary hover:underline">
            ← Back to Blog
          </Link>
        </ContentCard>
      </div>
    </SiteShell>
  );
}
