import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { SiteShell } from "@/components/layout/SiteShell";
import { ProductCard } from "@/components/ProductCard";
import { getCategoryDetail } from "@/lib/services/product.service";
import type { CategoryDetail } from "@/lib/types";

/**
 * Everything inside one category: the heading, sub-category filter chips and
 * the products. Reached from a category tile anywhere on the site.
 */
export function CategoryPage() {
  const { id = "" } = useParams();
  const [detail, setDetail] = useState<CategoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [subCategoryId, setSubCategoryId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    // Filtering happens client-side so switching chips is instant; the API
    // already sent every product in the category.
    getCategoryDetail(id)
      .then((data) => {
        if (!active) return;
        if (!data) setFailed(true);
        setDetail(data);
        setSubCategoryId(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const products = subCategoryId
    ? (detail?.products ?? []).filter((product) => product.subCategoryId === subCategoryId)
    : (detail?.products ?? []);

  if (loading) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-6xl px-4 py-16 text-center text-muted-foreground">Loading…</div>
      </SiteShell>
    );
  }

  if (failed || !detail) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Category not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This category may have been removed, or we couldn&apos;t reach the server.
          </p>
          <Link
            to="/products"
            className="btn-press mt-6 inline-block rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Browse all products
          </Link>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          All products
        </Link>

        <header className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              {detail.category.label}
            </h1>
            {detail.category.description && (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {detail.category.description}
              </p>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {/* Says "showing X of Y" only when a chip is actually narrowing the list. */}
            {subCategoryId && products.length !== detail.total
              ? `Showing ${products.length} of ${detail.total} items`
              : `Total ${products.length} item${products.length === 1 ? "" : "s"}`}
          </p>
        </header>

        {detail.subCategories.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            <FilterChip
              label="All"
              active={subCategoryId === null}
              onClick={() => setSubCategoryId(null)}
            />
            {detail.subCategories.map((sub) => (
              <FilterChip
                key={sub.id}
                label={sub.label}
                active={subCategoryId === sub.id}
                onClick={() => setSubCategoryId(sub.id)}
              />
            ))}
          </div>
        )}

        {products.length === 0 ? (
          <p className="mt-12 text-center text-sm text-muted-foreground">
            {subCategoryId
              ? "Nothing in this filter yet."
              : "Products in this category will show up here soon."}
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`btn-press rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:border-primary hover:text-primary"
      }`}
    >
      {label}
    </button>
  );
}
