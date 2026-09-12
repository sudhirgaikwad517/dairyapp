import { Link } from "react-router-dom";

import { useCartContext } from "@/context/cart-context";
import { productDisplayPrices } from "@/lib/product-helpers";
import type { ProductItem } from "@/lib/types";

const bottle = "/assets/bottle.jpg";

type ProductCardProps = {
  product: ProductItem;
  compact?: boolean;
  className?: string;
};

export function ProductCard({ product, compact = false, className = "" }: ProductCardProps) {
  const { addItem } = useCartContext();
  const imageSrc = product.imageUrl ?? bottle;
  const detailHref = `/products/${product.id}`;
  const prices = productDisplayPrices(product);
  const hasVariants = (product.variants?.length ?? 0) > 1;

  const handleAdd = (purchaseType: "BUY_ONCE" | "SUBSCRIPTION", openCart = false) => {
    void addItem(product.id, purchaseType, openCart, prices.variantId);
  };

  if (compact) {
    return (
      <article
        className={`group milk-product-card card-lift rounded-xl sm:rounded-2xl overflow-hidden border border-border flex flex-col h-full ${className}`}
      >
        <Link to={detailHref} className="relative h-20 sm:h-28 grid place-items-center overflow-hidden milk-product-splash shrink-0">
          <span className="absolute top-1.5 left-1.5 text-[8px] sm:text-[10px] font-extrabold tracking-wider text-primary-foreground px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full milk-badge z-[2] max-w-[85%] truncate">
            {product.badge}
          </span>
          <img
            src={imageSrc}
            alt={product.name}
            width={384}
            height={384}
            loading="lazy"
            className="relative z-[1] h-14 sm:h-20 w-auto object-contain drop-shadow-lg"
          />
        </Link>
        <div className="p-2 sm:p-3.5 bg-card/95 flex flex-col flex-1 gap-2 sm:gap-3">
          <Link to={detailHref} className="block min-w-0">
            <h3 className="font-semibold text-foreground text-xs sm:text-sm leading-snug line-clamp-2 hover:text-primary">
              {product.name}
            </h3>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {hasVariants ? `From ${prices.size}` : prices.size}
            </div>
          </Link>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            <div className="rounded-lg sm:rounded-xl milk-price-box px-1.5 sm:px-2.5 py-1.5 sm:py-2 text-center">
              <div className="text-[8px] sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-wide leading-tight">Buy Once</div>
              <div className="text-sm sm:text-base font-extrabold text-foreground mt-0.5">₹{prices.buyOnce}</div>
            </div>
            <div className="rounded-lg sm:rounded-xl milk-price-sub px-1.5 sm:px-2.5 py-1.5 sm:py-2 text-center">
              <div className="text-[8px] sm:text-[10px] font-semibold text-primary uppercase tracking-wide leading-tight">Subscribe</div>
              <div className="text-sm sm:text-base font-extrabold text-primary mt-0.5">₹{prices.subscription}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-auto">
            <button
              type="button"
              onClick={() => handleAdd("BUY_ONCE", true)}
              className="btn-press rounded-full bg-primary text-primary-foreground py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold hover:bg-primary/90 milk-btn-primary"
            >
              Order
            </button>
            <button
              type="button"
              onClick={() => handleAdd("SUBSCRIPTION")}
              className="btn-press rounded-full border-2 border-primary text-primary py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold hover:bg-primary-soft"
            >
              + Cart
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`group milk-product-card card-lift rounded-2xl overflow-hidden border border-border ${className}`}
    >
      <Link to={detailHref} className="relative aspect-[5/4] sm:aspect-[4/3] grid place-items-center overflow-hidden milk-product-splash block">
        <span className="absolute top-2.5 left-2.5 text-[10px] font-extrabold tracking-wider text-primary-foreground px-2.5 py-1 rounded-full milk-badge">
          {product.badge}
        </span>
        <div className="milk-ring milk-ring-compact" aria-hidden="true" />
        <img
          src={imageSrc}
          alt={product.name}
          width={768}
          height={768}
          loading="lazy"
          className="relative z-[1] h-28 sm:h-36 w-auto object-contain drop-shadow-2xl transition-transform duration-500 group-hover:-translate-y-2 group-hover:scale-105"
        />
      </Link>
      <div className="p-3 sm:p-4 bg-card/95">
        <Link to={detailHref}>
          <h3 className="font-semibold text-foreground text-center sm:text-left hover:text-primary">{product.name}</h3>
          <div className="text-xs text-muted-foreground text-center sm:text-left mt-0.5">
            {hasVariants ? `From ${prices.size}` : prices.size}
          </div>
        </Link>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl milk-price-box px-2.5 py-2 text-center sm:text-left">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Buy Once</div>
            <div className="text-base sm:text-lg font-extrabold text-foreground mt-0.5">₹{prices.buyOnce}</div>
          </div>
          <div className="rounded-xl milk-price-sub px-2.5 py-2 text-center sm:text-left">
            <div className="text-[10px] font-semibold text-primary uppercase tracking-wide">Subscription</div>
            <div className="text-base sm:text-lg font-extrabold text-primary mt-0.5">₹{prices.subscription}</div>
          </div>
        </div>
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => handleAdd("BUY_ONCE", true)}
            className="btn-press flex-1 rounded-full bg-primary text-primary-foreground py-2 text-sm font-semibold hover:bg-primary/90 milk-btn-primary"
          >
            Order Now
          </button>
          <button
            type="button"
            onClick={() => handleAdd("SUBSCRIPTION")}
            className="btn-press flex-1 rounded-full border-2 border-primary text-primary py-2 text-sm font-semibold hover:bg-primary-soft"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </article>
  );
}
