import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Droplets, Milk } from "lucide-react";

import { HorizontalScrollRow } from "@/components/layout/HorizontalScrollRow";
import { ProductCard } from "@/components/ProductCard";
import type { ProductCategory } from "@/lib/types";

type ProductsSectionProps = {
  productCategories: ProductCategory[];
  initialCategory?: string;
  searchQuery?: string;
  showHeading?: boolean;
  id?: string;
  /** Home: single-row horizontal scroll. Grid: full product listing (products page). */
  layout?: "home-scroll" | "grid";
};

export function ProductsSection({
  productCategories,
  initialCategory,
  searchQuery,
  showHeading = true,
  id = "products",
  layout = "grid",
}: ProductsSectionProps) {
  const [activeCategory, setActiveCategory] = useState(
    initialCategory ?? productCategories[0]?.id ?? "a2",
  );

  useEffect(() => {
    if (initialCategory && productCategories.some((c) => c.id === initialCategory)) {
      setActiveCategory(initialCategory);
    }
  }, [initialCategory, productCategories]);

  const activeProducts =
    productCategories.find((c) => c.id === activeCategory) ?? productCategories[0]!;

  const searchResults = useMemo(() => {
    const needle = searchQuery?.trim().toLowerCase();
    if (!needle) return null;

    return productCategories
      .flatMap((category) => category.items)
      .filter((product) => {
        const haystack = [
          product.name,
          product.size,
          product.badge,
          product.description ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(needle);
      });
  }, [productCategories, searchQuery]);

  const gridProducts = searchResults ?? activeProducts.items;
  const isSearchMode = Boolean(searchResults);

  const productsLink =
    activeCategory && activeCategory !== productCategories[0]?.id
      ? `/products?category=${activeCategory}`
      : "/products";

  return (
    <section
      id={id}
      className={
        layout === "home-scroll"
          ? "py-10 sm:py-12 relative"
          : showHeading
            ? "py-10 sm:py-14 relative"
            : "pt-3 pb-8 sm:pt-5 sm:pb-12 relative"
      }
    >
      <div className="absolute inset-0 milk-section-glow pointer-events-none" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4">
        {showHeading && (
          <div className="text-center mb-6 sm:mb-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-primary/15 px-4 py-1.5 text-xs font-bold text-primary mb-4">
              <Milk className="h-3.5 w-3.5" />
              Farm Fresh Daily
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold">Our Products</h2>
            <p className="mt-2 text-muted-foreground">Fresh. Pure & Packed with Nutrition.</p>
          </div>
        )}

        {!isSearchMode && (
        <div className="flex flex-wrap justify-center gap-2 mb-4 sm:mb-6">
          {productCategories.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id)}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm font-semibold transition-all ${
                activeCategory === tab.id
                  ? "text-primary-foreground shadow-md milk-tab-active"
                  : "text-foreground/70 hover:text-foreground milk-tab"
              }`}
              style={activeCategory !== tab.id ? { background: tab.tile } : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>
        )}

        {isSearchMode && (
          <p className="text-center text-sm text-muted-foreground mb-4">
            {gridProducts.length} result{gridProducts.length === 1 ? "" : "s"} for &ldquo;{searchQuery}&rdquo;
          </p>
        )}

        {layout === "home-scroll" ? (
          <>
            <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
              <p className="text-sm text-muted-foreground flex items-center gap-2 min-w-0">
                <Droplets className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{activeProducts.subscriptionNote}</span>
              </p>
              <Link
                to={productsLink}
                className="products-home-view-all-link shrink-0"
                aria-label="View all products"
              >
                <span className="text-xs sm:text-sm font-bold">View All</span>
                <span className="products-home-view-all-link__btn">
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </span>
              </Link>
            </div>
            <HorizontalScrollRow as="nav" aria-label="Featured products" className="products-home-scroll">
              <div className="products-home-scroll-row">
                {activeProducts.items.map((p) => (
                  <ProductCard key={p.id} product={p} compact className="products-home-scroll-card" />
                ))}
              </div>
            </HorizontalScrollRow>
          </>
        ) : (
          <>
            {!isSearchMode && (
            <p className="text-center text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-5 flex items-center justify-center gap-1.5 sm:gap-2">
              <Droplets className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
              <span>{activeProducts.subscriptionNote}</span>
            </p>
            )}
            {gridProducts.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No products found. Try a different search.</p>
            ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
            {gridProducts.map((p, i) => (
              <div key={p.id} className="animate-fade-up min-w-0" style={{ animationDelay: `${i * 100}ms` }}>
                <ProductCard product={p} compact />
              </div>
            ))}
            </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
