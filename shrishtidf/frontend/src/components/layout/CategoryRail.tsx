import { useRef } from "react";
import { Link } from "react-router-dom";

import { useScrollUpPinned } from "@/hooks/use-scroll-up-pinned";

const ICON_VERSION = "2";

const categories = [
  {
    t: "A2 Milk",
    image: `/assets/category-rail/a2-milk.jpg?v=${ICON_VERSION}`,
    href: "/products?category=a2",
  },
  {
    t: "Buffalo Milk",
    image: `/assets/category-rail/buffalo-milk.jpg?v=${ICON_VERSION}`,
    href: "/products?category=buffalo",
  },
  {
    t: "High Protein",
    image: `/assets/category-rail/high-protein.jpg?v=${ICON_VERSION}`,
    href: "/products?category=high-protein",
  },
  {
    t: "Trial Packs",
    image: `/assets/category-rail/trial-packs.jpg?v=${ICON_VERSION}`,
    href: "/trial-packs",
  },
  {
    t: "Combos",
    image: `/assets/category-rail/combos.jpg?v=${ICON_VERSION}`,
    href: "/combo-savers",
  },
  {
    t: "Coffee Milk",
    image: `/assets/category-rail/coffee-milk.jpg?v=${ICON_VERSION}`,
    href: "/products/hp-coffee",
  },
  {
    t: "Order Now",
    image: `/assets/category-rail/order-now.jpg?v=${ICON_VERSION}`,
    href: "/products",
  },
  {
    t: "Shop All",
    image: `/assets/category-rail/shop-all.jpg?v=${ICON_VERSION}`,
    href: "/products",
  },
];

function CategoryRailItems() {
  return (
    <div className="category-rail-scroll">
      <div className="category-rail-track">
        {categories.map((cat) => (
          <Link
            key={cat.t}
            to={cat.href}
            className="category-item group flex w-[4rem] shrink-0 snap-start flex-col items-center gap-1.5 sm:w-20 sm:gap-2"
          >
            <div className="category-circle category-circle--image">
              <img
                src={cat.image}
                alt=""
                width={64}
                height={64}
                className="category-circle-img"
                loading="lazy"
              />
            </div>
            <span className="category-label text-center text-[10px] font-semibold leading-tight text-foreground sm:text-[11px]">
              {cat.t}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function CategoryRail() {
  const railRef = useRef<HTMLDivElement>(null);
  const pinned = useScrollUpPinned(railRef);

  return (
    <>
      <div ref={railRef} className="border-t border-border bg-primary-soft/30" aria-hidden={pinned}>
        <div className="category-rail-wrap mx-auto max-w-7xl py-4 sm:px-4 sm:py-5">
          <CategoryRailItems />
        </div>
      </div>

      {pinned && (
        <div className="category-rail-pinned" role="navigation" aria-label="Categories">
          <div className="category-rail-wrap mx-auto max-w-7xl py-3 sm:px-4 sm:py-4">
            <CategoryRailItems />
          </div>
        </div>
      )}
    </>
  );
}
