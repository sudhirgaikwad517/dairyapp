import { apiUrl, fetchOptions } from "@/lib/api/client";
import type { ApiResponse } from "@/lib/api/response";
import { API_ROUTES } from "@/lib/api/response";
import type { ProductDto, ProductsListData } from "@/lib/api/types";
import { DEFAULT_PRODUCT_CATEGORIES } from "@/lib/site-data";
import type { ProductCategory, ProductItem } from "@/lib/types";

export async function getProductsList(): Promise<{
  data: ProductsListData;
  source: "database" | "fallback";
}> {
  try {
    const res = await fetch(apiUrl(API_ROUTES.products), fetchOptions);
    const json = await res.json();
    if (json.success) {
      return {
        data: {
          categories: json.data.categories,
          products: json.data.products,
        },
        source: json.data.source ?? "database",
      };
    }
  } catch {
    /* fall through */
  }

  return {
    data: {
      categories: DEFAULT_PRODUCT_CATEGORIES,
      products: DEFAULT_PRODUCT_CATEGORIES.flatMap((category) =>
        category.items.map((item) => ({
          id: item.id,
          categoryId: category.id,
          categoryLabel: category.label,
          name: item.name,
          size: item.size,
          buyOnce: item.buyOnce,
          subscription: item.subscription,
          badge: item.badge,
          videoUrl: item.videoUrl,
          videoPoster: item.videoPoster,
        })),
      ),
    },
    source: "fallback",
  };
}

export async function getProductCategories(): Promise<ProductCategory[]> {
  const { data } = await getProductsList();
  return data.categories;
}

export async function getProductById(id: string): Promise<ProductItem | null> {
  try {
    const res = await fetch(apiUrl(API_ROUTES.productById(id)), fetchOptions);
    const json = (await res.json()) as ApiResponse<ProductDto>;
    if (json.success) {
      return {
        id: json.data.id,
        name: json.data.name,
        size: json.data.size,
        buyOnce: json.data.buyOnce,
        subscription: json.data.subscription,
        badge: json.data.badge,
        imageUrl: json.data.imageUrl,
        description: json.data.description,
        specifications: json.data.specifications,
        videoUrl: json.data.videoUrl,
        videoPoster: json.data.videoPoster,
        ratingAvg: json.data.ratingAvg,
        reviewCount: json.data.reviewCount,
        reviews: json.data.reviews,
        categoryId: json.data.categoryId,
        categoryLabel: json.data.categoryLabel,
        variants: json.data.variants,
        crossSells: json.data.crossSells,
        allowSubscription: json.data.allowSubscription,
      };
    }
  } catch {
    /* fall through */
  }

  const { data } = await getProductsList();
  const found = data.products.find((product) => product.id === id);
  if (!found) return null;

  return {
    id: found.id,
    name: found.name,
    size: found.size,
    buyOnce: found.buyOnce,
    subscription: found.subscription,
    badge: found.badge,
    imageUrl: found.imageUrl,
    description: found.description,
    specifications: found.specifications,
    videoUrl: found.videoUrl,
    videoPoster: found.videoPoster,
    ratingAvg: found.ratingAvg,
    reviewCount: found.reviewCount,
    reviews: found.reviews,
    categoryId: found.categoryId,
    categoryLabel: found.categoryLabel,
  };
}
