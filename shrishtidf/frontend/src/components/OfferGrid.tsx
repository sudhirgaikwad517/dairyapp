import { useCartContext } from "@/context/cart-context";
import { Link } from "react-router-dom";

import { ContentCard } from "@/components/layout/ContentCard";
import { getDefaultVariant } from "@/lib/product-helpers";
import type { ProductItem } from "@/lib/types";

type OfferCard = {
  title: string;
  desc: string;
  price: string;
  note?: string;
  save?: string;
  productId?: string;
};

type OfferGridProps = {
  items: OfferCard[];
  products?: ProductItem[];
  ctaHref?: string;
};

export function OfferGrid({ items, products = [], ctaHref = "/products" }: OfferGridProps) {
  const { addItem } = useCartContext();

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item, index) => {
        const product = item.productId
          ? products.find((p) => p.id === item.productId)
          : products[index];
        const variant = product ? getDefaultVariant(product) : null;

        return (
          <ContentCard key={item.productId ?? item.title}>
            <h3 className="font-display text-xl font-bold text-foreground">{item.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
            <div className="mt-4 text-2xl font-extrabold text-primary">
              {product ? `₹${variant?.buyOnce ?? product.buyOnce}` : item.price}
            </div>
            {(item.note || item.save) && (
              <p className="mt-1 text-xs font-semibold text-muted-foreground">{item.note ?? item.save}</p>
            )}
            {product ? (
              <div className="mt-6 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => addItem(product.id, "BUY_ONCE", true, variant?.id)}
                  className="inline-flex justify-center rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90"
                >
                  Add to Cart
                </button>
                <Link
                  to={`/products/${product.id}`}
                  className="inline-flex justify-center rounded-full border border-primary text-primary px-5 py-2.5 text-sm font-semibold hover:bg-primary-soft"
                >
                  View Details
                </Link>
              </div>
            ) : (
              <Link
                to={ctaHref}
                className="mt-6 inline-flex rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90"
              >
                Order Now
              </Link>
            )}
          </ContentCard>
        );
      })}
    </div>
  );
}
