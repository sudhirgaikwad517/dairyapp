export type NavLink = {
  href: string;
  label: string;
  chevron?: boolean;
};

export const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products", chevron: true },
  { href: "/about", label: "About Us" },
  { href: "/blog", label: "Blogs" },
  { href: "/faqs", label: "FAQs" },
  { href: "/contact", label: "Contact" },
];

export const FOOTER_QUICK_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/products", label: "Products" },
  { href: "/subscription", label: "Subscription" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact Us" },
] as const;

export const FOOTER_PRODUCT_LINKS = [
  { href: "/products?category=a2", label: "A2 Gir Cow Milk" },
  { href: "/products?category=buffalo", label: "Farm Fresh Buffalo Milk" },
  { href: "/products?category=high-protein", label: "High protein Milk" },
  { href: "/products?category=high-protein", label: "High Protein Coffee" },
  { href: "/products?category=a2", label: "A2 Curd & Ghee" },
] as const;

export const LEGAL_LINKS = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/refund-policy", label: "Refund & Cancellation" },
  { href: "/shipping-policy", label: "Shipping & Delivery" },
] as const;

export const PROMO_UTILITY_LINKS = [
  { href: "/track-order", label: "Track Order" },
  { href: "/help", label: "Help" },
] as const;
