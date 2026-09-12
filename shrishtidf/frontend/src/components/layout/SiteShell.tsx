import { lazy, Suspense, useEffect } from "react";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { CartProvider, useCartContext } from "@/context/cart-context";
import { useSiteContent } from "@/hooks/use-site-content";

const CartDrawer = lazy(() =>
  import("@/components/CartDrawer").then((module) => ({ default: module.CartDrawer })),
);

type SiteShellProps = {
  children: React.ReactNode;
  /** Set false to hide the category icon row on a specific page. */
  showCategoryRail?: boolean;
};

function SiteShellInner({ children, showCategoryRail = true }: SiteShellProps) {
  const {
    cart,
    open: cartOpen,
    setOpen: setCartOpen,
    updateQuantity,
    removeItem,
    placeOrder,
    syncCart,
  } = useCartContext();
  const { content } = useSiteContent();

  useEffect(() => {
    if (cartOpen) syncCart();
  }, [cartOpen, syncCart]);

  return (
    <div className="min-h-screen milk-page-bg">
      <SiteHeader showCategoryRail={showCategoryRail} />
      <main>{children}</main>
      <SiteFooter />
      <WhatsAppFloat phone={content.whatsappNumber} />
      {cartOpen && (
        <Suspense fallback={null}>
          <CartDrawer
            cart={cart}
            open={cartOpen}
            onClose={() => setCartOpen(false)}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            onPlaceOrder={placeOrder}
          />
        </Suspense>
      )}
    </div>
  );
}

export function SiteShell({ children, showCategoryRail = true }: SiteShellProps) {
  return (
    <CartProvider>
      <SiteShellInner showCategoryRail={showCategoryRail}>{children}</SiteShellInner>
    </CartProvider>
  );
}
