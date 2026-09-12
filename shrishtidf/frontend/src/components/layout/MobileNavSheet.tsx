import { Link, useLocation } from "react-router-dom";
import {
  HelpCircle,
  LogIn,
  PackageSearch,
  ShoppingCart,
  User,
  X,
} from "lucide-react";

import { SiteSearch } from "@/components/SiteSearch";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCartContext } from "@/context/cart-context";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { NAV_LINKS, PROMO_UTILITY_LINKS } from "@/lib/navigation";

type MobileNavSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNavSheet({ open, onOpenChange }: MobileNavSheetProps) {
  const { pathname } = useLocation();
  const { itemCount, setOpen: setCartOpen } = useCartContext();
  const { isLoggedIn } = useCustomerAuth();

  const close = () => onOpenChange(false);

  const handleCart = () => {
    close();
    setCartOpen(true);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(100vw,20rem)] p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-border text-left">
          <SheetTitle className="font-display text-lg">Menu</SheetTitle>
        </SheetHeader>

        <div className="px-5 py-4 border-b border-border">
          <SiteSearch
            inputClassName="w-full rounded-full border-2 border-primary/25 bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary"
            placeholder="Search products…"
            onSearch={close}
          />
        </div>

        <div className="px-5 py-4 space-y-2 border-b border-border">
          <Link
            to={isLoggedIn ? "/account" : "/login"}
            onClick={close}
            className="flex items-center gap-3 rounded-xl border-2 border-primary/20 px-4 py-3 font-semibold text-sm hover:border-primary transition-colors"
          >
            {isLoggedIn ? <User className="h-5 w-5 text-primary" /> : <LogIn className="h-5 w-5 text-primary" />}
            {isLoggedIn ? "My Account" : "Login / Sign up"}
          </Link>

          <button
            type="button"
            onClick={handleCart}
            className="w-full flex items-center gap-3 rounded-xl border-2 border-primary/20 px-4 py-3 font-semibold text-sm hover:border-primary transition-colors"
          >
            <ShoppingCart className="h-5 w-5 text-primary" />
            Cart
            {itemCount > 0 && (
              <span className="ml-auto rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5 font-bold">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </button>

          {PROMO_UTILITY_LINKS.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={close}
              className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-colors"
            >
              {link.href === "/track-order" ? (
                <PackageSearch className="h-4 w-4 text-primary" />
              ) : (
                <HelpCircle className="h-4 w-4 text-primary" />
              )}
              {link.label}
            </Link>
          ))}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Mobile navigation">
          <ul className="space-y-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  to={link.href}
                  onClick={close}
                  data-active={isNavActive(pathname, link.href) ? "true" : undefined}
                  className="block rounded-xl px-4 py-3 text-sm font-semibold text-foreground hover:bg-primary/5 data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          onClick={close}
          className="m-4 flex items-center justify-center gap-2 rounded-full border border-border py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" /> Close menu
        </button>
      </SheetContent>
    </Sheet>
  );
}
