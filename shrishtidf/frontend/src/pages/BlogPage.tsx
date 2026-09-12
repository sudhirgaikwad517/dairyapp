import { Link } from "react-router-dom";

import { ContentCard } from "@/components/layout/ContentCard";
import { PageHero } from "@/components/layout/PageHero";
import { SiteShell } from "@/components/layout/SiteShell";
import { useBlogPosts } from "@/hooks/use-blog-posts";

export function BlogPage() {
  const { posts, loading } = useBlogPosts();

  return (
    <SiteShell>
      <PageHero
        eyebrow="News"
        title="Blogs"
        subtitle="A2 milk tips, ghee benefits, and nutrition stories from Shrishti Dairy Farm."
      />
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-6">
        {loading && <p className="text-sm text-muted-foreground text-center">Loading posts…</p>}
        {posts.map((post) => (
          <ContentCard key={post.slug}>
            <time className="text-xs text-muted-foreground">
              {new Date(post.date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
            <h2 className="font-display text-xl font-bold mt-2 text-foreground">{post.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
            <Link
              to={`/blog/${post.slug}`}
              className="inline-block mt-4 text-sm font-semibold text-primary hover:underline"
            >
              Read more →
            </Link>
          </ContentCard>
        ))}
      </div>
    </SiteShell>
  );
}
