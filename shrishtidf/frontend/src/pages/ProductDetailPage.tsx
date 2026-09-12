import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";

import { ContentCard } from "@/components/layout/ContentCard";
import { SiteShell } from "@/components/layout/SiteShell";
import { useCartContext } from "@/context/cart-context";
import { getProductById } from "@/lib/services/product.service";
import { getDefaultVariant } from "@/lib/product-helpers";
import type { ProductItem, ProductVariant } from "@/lib/types";

const bottle = "/assets/bottle.jpg";

function specsEntries(specs: ProductItem["specifications"]): [string, string][] {
  if (!specs) return [];
  if (Array.isArray(specs)) {
    return specs
      .map((entry) => {
        if (typeof entry === "string") return ["Detail", entry] as [string, string];
        const key = entry.key ?? "Detail";
        const value = entry.value ?? "";
        return [key, value] as [string, string];
      })
      .filter(([, value]) => value);
  }
  return Object.entries(specs).filter(([, value]) => Boolean(value));
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-border"}`}
        />
      ))}
    </div>
  );
}

function ProductDetailInner({ id }: { id: string }) {
  const { addItem } = useCartContext();
  const [product, setProduct] = useState<ProductItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getProductById(id).then((data) => {
      if (!active) return;
      setProduct(data);
      setSelectedVariant(data ? getDefaultVariant(data) : null);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id]);

  const specs = useMemo(() => specsEntries(product?.specifications), [product?.specifications]);
  const reviews = product?.reviews ?? [];
  const ratingAvg = product?.ratingAvg ?? 0;
  const reviewCount = product?.reviewCount ?? reviews.length;

  if (loading) {
    return <div className="min-h-[40vh] grid place-items-center text-muted-foreground">Loading product…</div>;
  }

  if (!product) {
    return <Navigate to="/products" replace />;
  }

  const imageSrc = product.imageUrl ?? bottle;
  const activeVariant = selectedVariant ?? getDefaultVariant(product);
  const buyOncePrice = activeVariant?.buyOnce ?? product.buyOnce;
  const subscriptionPrice = activeVariant?.subscription ?? product.subscription;
  const sizeLabel = activeVariant?.sizeLabel ?? product.size;
  const variantId = activeVariant?.id;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <Link
        to="/products"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to products
      </Link>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        <ContentCard>
          <div className="relative aspect-square grid place-items-center milk-product-splash rounded-xl overflow-hidden">
            {product.badge && (
              <span className="absolute top-3 left-3 text-[10px] font-extrabold tracking-wider text-primary-foreground px-2.5 py-1 rounded-full milk-badge z-[2]">
                {product.badge}
              </span>
            )}
            <img
              src={imageSrc}
              alt={product.name}
              className="relative z-[1] max-h-72 w-auto object-contain drop-shadow-xl"
            />
          </div>
        </ContentCard>

        <div className="space-y-6">
          {product.categoryLabel && (
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              {product.categoryLabel}
            </div>
          )}
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">{product.name}</h1>
            <p className="mt-1 text-muted-foreground">{sizeLabel}</p>
          </div>

          {(product.variants?.length ?? 0) > 1 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Choose size</div>
              <div className="flex flex-wrap gap-2">
                {product.variants!.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedVariant(variant)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${
                      activeVariant?.id === variant.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:border-primary"
                    }`}
                  >
                    {variant.sizeLabel}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(reviewCount > 0 || ratingAvg > 0) && (
            <div className="flex items-center gap-2 text-sm">
              <Stars rating={ratingAvg} />
              <span className="font-semibold text-foreground">{ratingAvg.toFixed(1)}</span>
              <span className="text-muted-foreground">({reviewCount} reviews)</span>
            </div>
          )}

          {product.description && (
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{product.description}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl milk-price-box px-4 py-3">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Buy Once</div>
              <div className="text-2xl font-extrabold text-foreground mt-1">₹{buyOncePrice}</div>
            </div>
            <div className="rounded-xl milk-price-sub px-4 py-3">
              <div className="text-[10px] font-semibold text-primary uppercase tracking-wide">Subscription</div>
              <div className="text-2xl font-extrabold text-primary mt-1">₹{subscriptionPrice}</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => addItem(product.id, "BUY_ONCE", true, variantId)}
              className="btn-press flex-1 rounded-full bg-primary text-primary-foreground py-3 text-sm font-semibold hover:bg-primary/90 milk-btn-primary"
            >
              Order Now
            </button>
            <button
              type="button"
              onClick={() => addItem(product.id, "SUBSCRIPTION", false, variantId)}
              className="btn-press flex-1 rounded-full border-2 border-primary text-primary py-3 text-sm font-semibold hover:bg-primary-soft"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>

      {specs.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold mb-4">Specifications</h2>
          <ContentCard>
            <dl className="grid sm:grid-cols-2 gap-4">
              {specs.map(([label, value]) => (
                <div key={label} className="border-b border-border/70 pb-3 last:border-0">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </ContentCard>
        </section>
      )}

      {(product.crossSells?.length ?? 0) > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold mb-4">You may also like</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {product.crossSells!.map((item) => (
              <Link key={item.id} to={`/products/${item.id}`} className="milk-card rounded-xl border border-border p-4 hover:border-primary transition-colors">
                <div className="font-semibold text-foreground">{item.name}</div>
                <div className="text-xs text-muted-foreground">{item.size}</div>
                <div className="text-sm font-bold text-primary mt-2">₹{item.buyOnce}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold mb-4">Customer Reviews</h2>
        {reviews.length === 0 ? (
          <ContentCard>
            <p className="text-sm text-muted-foreground">No reviews yet. Check back soon.</p>
          </ContentCard>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <ContentCard key={review.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold text-foreground">{review.customerName}</div>
                  <Stars rating={review.rating} />
                </div>
                {review.comment && (
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                )}
              </ContentCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <Navigate to="/products" replace />;
  }

  return (
    <SiteShell>
      <ProductDetailInner id={id} />
    </SiteShell>
  );
}
