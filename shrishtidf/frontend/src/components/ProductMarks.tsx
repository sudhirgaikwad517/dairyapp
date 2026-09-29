/**
 * Small shared bits of product presentation used by the card, the category
 * page and the detail page, so all three stay consistent.
 */

/** The standard FSSAI veg / non-veg mark: a square outline around a filled dot. */
export function FoodTypeMark({ isVeg, className = "" }: { isVeg: boolean; className?: string }) {
  const color = isVeg ? "border-green-600" : "border-red-700";
  const dot = isVeg ? "bg-green-600" : "bg-red-700";

  return (
    <span
      role="img"
      aria-label={isVeg ? "Vegetarian" : "Non vegetarian"}
      title={isVeg ? "Vegetarian" : "Non vegetarian"}
      className={`inline-grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[2px] border-[1.5px] ${color} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
    </span>
  );
}

/**
 * Selling price, plus the struck-through MRP and "% off" — but only when
 * `mrp` is a real one the admin entered (0 means show nothing).
 */
export function PriceWithMrp({
  price,
  mrp,
  discountPercent,
  className = "",
}: {
  price: number;
  mrp: number;
  discountPercent: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-1.5 ${className}`}>
      <span className="font-extrabold text-foreground">₹{price}</span>
      {mrp > price && (
        <>
          <span className="text-xs text-muted-foreground line-through">₹{mrp}</span>
          <span className="text-xs font-semibold text-green-600">{discountPercent}% off</span>
        </>
      )}
    </span>
  );
}

/** The curated tag, rendered only when the product actually has one. */
export function ProductBadge({ badge, className = "" }: { badge?: string; className?: string }) {
  if (!badge) return null;

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-wider ${className}`}
    >
      {badge}
    </span>
  );
}

export function OutOfStockPill({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground ${className}`}
    >
      Sold out
    </span>
  );
}
