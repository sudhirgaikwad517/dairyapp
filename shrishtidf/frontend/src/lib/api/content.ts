import type { ApiResponse } from "@/lib/api/response";
import { API_ROUTES } from "@/lib/api/response";

export type SiteContentDto = {
  heroBadge: string;
  freeSampleButtonLabel: string;
  whatsappNumber: string;
  promoMessages: string[];
};

export type LeadInput = {
  name: string;
  phone: string;
  source?: string;
  message?: string;
};

export type BlogPostSummary = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
};

export type BlogPostDetail = BlogPostSummary & {
  body: string;
};

export type RazorpayOrderResponse = {
  razorpay: {
    configured: boolean;
    keyId?: string;
    orderId?: string;
    amount?: number;
    currency?: string;
    receipt?: string;
    message?: string;
  };
  cartTotal: number;
};

export async function fetchSiteContent(): Promise<SiteContentDto | null> {
  try {
    const res = await fetch(API_ROUTES.siteContent);
    const json = (await res.json()) as ApiResponse<SiteContentDto>;
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export async function submitLead(input: LeadInput): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(API_ROUTES.leads, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    const json = (await res.json()) as ApiResponse<unknown>;
    if (json.success) return { ok: true };
    return { ok: false, message: json.error?.message ?? "Unable to submit" };
  } catch {
    return { ok: false, message: "Network error. Please try again." };
  }
}

export async function fetchBlogPosts(): Promise<BlogPostSummary[]> {
  try {
    const res = await fetch(API_ROUTES.blogs);
    const json = (await res.json()) as ApiResponse<{ posts: BlogPostSummary[] }>;
    return json.success ? json.data.posts : [];
  } catch {
    return [];
  }
}

export async function fetchBlogPost(slug: string): Promise<BlogPostDetail | null> {
  try {
    const res = await fetch(API_ROUTES.blogBySlug(slug));
    const json = (await res.json()) as ApiResponse<BlogPostDetail>;
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export async function createRazorpayOrder(): Promise<RazorpayOrderResponse | null> {
  try {
    const res = await fetch(API_ROUTES.paymentsRazorpayOrder, {
      method: "POST",
      headers: { Accept: "application/json" },
      credentials: "include",
    });
    const json = (await res.json()) as ApiResponse<RazorpayOrderResponse>;
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}
