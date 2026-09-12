import { Link } from "react-router-dom";
import { Facebook, Instagram, MapPin, MessageCircle, Phone, Youtube } from "lucide-react";

import {
  FOOTER_PRODUCT_LINKS,
  FOOTER_QUICK_LINKS,
  LEGAL_LINKS,
} from "@/lib/navigation";
import { CONTACT } from "@/lib/site-data";

export function SiteFooter() {
  return (
    <footer id="contact" className="w-full text-primary-foreground" style={{ background: "var(--brand-blue-deeper)" }}>
      <div className="mx-auto max-w-7xl px-4 py-14 grid grid-cols-2 gap-x-6 gap-y-8 text-sm md:grid-cols-2 lg:grid-cols-5 lg:gap-8">
        <div className="col-span-2 text-center sm:text-left lg:col-span-2">
          <img
            src="/assets/logo.webp"
            alt="Shrishti Dairy Farm"
            className="mx-auto h-20 w-auto mb-2 brightness-0 invert sm:mx-0"
            width={200}
            height={200}
          />
          <p className="mx-auto max-w-md opacity-90 sm:mx-0 sm:max-w-xs">
            Shrishti A2 Milk — Farm Fresh Certified A2 milk. 100% Natural Products Farm to Home.
          </p>
          <div className="mt-5 flex justify-center gap-3 sm:justify-start">
            {[Facebook, Instagram, Youtube, MessageCircle].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="h-9 w-9 rounded-full bg-primary-foreground/15 grid place-items-center transition-all duration-300 hover:bg-primary-foreground hover:text-primary hover:-translate-y-1"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h5 className="font-bold mb-4">Quick Links</h5>
          <ul className="space-y-2 opacity-90">
            {FOOTER_QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <Link to={link.href} className="link-soft inline-block">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h5 className="font-bold mb-4">Our Products</h5>
          <ul className="space-y-2 opacity-90">
            {FOOTER_PRODUCT_LINKS.map((link) => (
              <li key={link.label}>
                <Link to={link.href} className="link-soft inline-block">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="col-span-2 lg:col-span-1">
          <h5 className="font-bold mb-4">Contact Us</h5>
          <ul className="space-y-3 opacity-90">
            <li className="flex items-start gap-2">
              <Phone className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                <a href={`tel:+91${CONTACT.phones[0]}`} className="link-soft">
                  +91 {CONTACT.phones[0]}
                </a>
                <br />
                <a href={`tel:+91${CONTACT.phones[1]}`} className="link-soft">
                  +91 {CONTACT.phones[1]}
                </a>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{CONTACT.address}</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/15">
        <div className="mx-auto max-w-7xl px-4 py-5 flex flex-col items-center justify-between gap-3 text-center text-xs opacity-90 md:flex-row md:text-left">
          <div>© 2026 Shrishti A2 Milk | Farm Fresh Certified A2 milk Dairy Farm</div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} to={link.href} className="link-soft">
                {link.label}
              </Link>
            ))}
          </div>
          <div className="bg-card text-foreground rounded px-3 py-1 font-semibold">
            FSSAI 21524003000030
          </div>
        </div>
      </div>
    </footer>
  );
}
