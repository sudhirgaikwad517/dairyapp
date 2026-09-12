import { useEffect, useState } from "react";

import { fetchBlogPosts, type BlogPostSummary } from "@/lib/api/content";
import { BLOG_POSTS } from "@/lib/page-content";

export function useBlogPosts() {
  const [posts, setPosts] = useState<BlogPostSummary[]>(
    BLOG_POSTS.map((post) => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      date: post.date,
    })),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchBlogPosts().then((data) => {
      if (!active) return;
      if (data.length > 0) setPosts(data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { posts, loading };
}
