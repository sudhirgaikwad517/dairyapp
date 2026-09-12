import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronRight,
  Facebook,
  Instagram,
  Mail,
  Menu,
  Phone,
  ShoppingCart,
  User,
  Youtube,
} from "lucide-react";

import { CategoryRail } from "@/components/layout/CategoryRail";
import { HorizontalScrollRow } from "@/components/layout/HorizontalScrollRow";
import { MobileNavSheet } from "@/components/layout/MobileNavSheet";
import { PromoMarquee } from "@/components/layout/PromoMarquee";
import { SiteLogo } from "@/components/layout/SiteLogo";
import { SiteSearch } from "@/components/SiteSearch";
import { useCartContext } from "@/context/cart-context";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { useSiteContent } from "@/hooks/use-site-content";
import { NAV_LINKS, PROMO_UTILITY_LINKS } from "@/lib/navigation";
import { CONTACT } from "@/lib/site-data";

type SiteHeaderProps = {
  showCategoryRail?: boolean;
};

function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ showCategoryRail = true }: SiteHeaderProps) {
  const { pathname } = useLocation();
  const { itemCount, setOpen: setCartOpen } = useCartContext();
  const { content } = useSiteContent();
  const { isLoggedIn } = useCustomerAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <div className="nav-animated-bar border-b border-border">
        <div className="relative z-[1] mx-auto max-w-7xl px-3 sm:px-4 py-2">
          <div className="sm:hidden">
            <PromoMarquee messages={content.promoMessages} />
          </div>
          <div className="hidden sm:grid grid-cols-[auto_1fr_auto] items-center gap-4">
            <div className="flex items-center gap-1 sm:gap-2">
              <a href={`tel:+91${CONTACT.phones[0]}`} aria-label="Call" className="promo-bar-icon">
                <Phone className="h-3.5 w-3.5" />
              </a>
              <Link to="/contact" aria-label="Email" className="promo-bar-icon">
                <Mail className="h-3.5 w-3.5" />
              </Link>
              <a href="#" aria-label="Facebook" className="promo-bar-icon">
                <Facebook className="h-3.5 w-3.5" />
              </a>
              <a href="#" aria-label="Instagram" className="promo-bar-icon">
                <Instagram className="h-3.5 w-3.5" />
              </a>
              <a href="#" aria-label="YouTube" className="promo-bar-icon">
                <Youtube className="h-3.5 w-3.5" />
              </a>
            </div>
            <PromoMarquee messages={content.promoMessages} />
            <div className="flex items-center gap-3 text-xs font-medium whitespace-nowrap">
              {PROMO_UTILITY_LINKS.map((link, i) => (
                <span key={link.href} className="flex items-center gap-3">
                  {i > 0 && <span className="text-white/40">•</span>}
                  <Link to={link.href} className="promo-bar-icon !min-w-0 !min-h-0 px-1">
                    {link.label}
                  </Link>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <header className="bg-card border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-5 grid grid-cols-[auto_1fr_auto] items-center gap-6">
          <SiteLogo />
          <div className="hidden md:block">
            <SiteSearch
              className="max-w-2xl mx-auto"
              inputClassName="w-full rounded-full border-2 border-primary/30 bg-card pl-11 pr-5 py-3 text-sm outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 sm:gap-4 justify-self-end">
            <Link
              to={isLoggedIn ? "/account" : "/login"}
              className="hidden sm:inline-flex items-center gap-2 rounded-full border-2 border-primary/30 px-4 py-2 text-sm font-semibold text-foreground hover:border-primary transition-colors"
            >
              <User className="h-4 w-4" /> {isLoggedIn ? "Account" : "Login"}
            </Link>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative rounded-full border-2 border-primary/30 p-2.5 hover:border-primary transition-colors"
              aria-label="Open cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] grid place-items-center font-bold">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden rounded-full border-2 border-primary/30 p-2.5 hover:border-primary transition-colors"
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="nav-animated-bar border-t border-border">
          <HorizontalScrollRow
            as="nav"
            variant="dark"
            aria-label="Main navigation"
            className="relative z-[1] mx-auto max-w-7xl px-2 sm:px-4 py-2 sm:py-3"
            trackClassName="nav-bar-scroll sm:justify-center"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="nav-bar-link snap-start"
                data-active={isNavActive(pathname, link.href) ? "true" : undefined}
              >
                {link.label}
                {link.chevron && <ChevronRight className="h-3 w-3 rotate-90 shrink-0" />}
              </Link>
            ))}
          </HorizontalScrollRow>
        </div>

        {showCategoryRail && <CategoryRail />}
      </header>

      <MobileNavSheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />
    </>
  );
}
