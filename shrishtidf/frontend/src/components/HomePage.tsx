import { Link } from "react-router-dom";
import { useState } from "react";
import {
  ArrowRight,
  Beef,
  CheckCircle2,
  Heart,
  Leaf,
  Milk,
  Play,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";

import { HeroBannerCarousel } from "@/components/HeroBannerCarousel";
import { FreeSampleModal } from "@/components/FreeSampleModal";
import { MilkBubbles } from "@/components/MilkDecor";
import { ProductsSection } from "@/components/ProductsSection";
import { TrendingReelsSection } from "@/components/TrendingReelsSection";
import { SiteShell } from "@/components/layout/SiteShell";
import { useSiteContent } from "@/hooks/use-site-content";
import type { ProductCategory } from "@/lib/types";

const bottle = "/assets/bottle.jpg";
const farmStory = "/assets/farm-story.jpg";

const features = [
  { icon: Sparkles, title: "Pure & Natural", desc: "Milk that is unadulterated, pure and safe to consume." },
  { icon: Beef, title: "High Protein", desc: "High protein milk and coffee for your active lifestyle." },
  { icon: ShieldCheck, title: "Certified A2", desc: "Farm fresh certified A2 Gir cow milk you can trust." },
  { icon: Truck, title: "Farm to Home", desc: "100% natural products delivered from our farm to you." },
  { icon: Leaf, title: "No Adulteration", desc: "Pure, natural milk with no harmful additives." },
];

type HomePageProps = {
  productCategories: ProductCategory[];
};

export function HomePage({ productCategories }: HomePageProps) {
  const { content } = useSiteContent();
  const [freeSampleOpen, setFreeSampleOpen] = useState(false);

  return (
    <SiteShell>
      <section className="hero-banner relative overflow-hidden border-b border-border">
        <MilkBubbles className="absolute inset-0 z-0" />
        <div className="hero-banner-bg" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-3 sm:px-4 py-10 sm:py-12 lg:py-16">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-x-12 lg:gap-y-10 items-center">
            <div className="order-2 lg:order-1 animate-fade-up text-center lg:text-left">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-5 sm:mb-6">
                <span className="inline-block rounded-full bg-primary-soft text-primary text-[10px] sm:text-xs font-semibold tracking-wider px-4 py-1.5">
                  {content.heroBadge}
                </span>
                <button
                  type="button"
                  onClick={() => setFreeSampleOpen(true)}
                  className="inline-block rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold tracking-wider uppercase px-4 py-2 shadow-md shadow-primary/25 ring-2 ring-primary/20 hover:bg-primary/90 hover:shadow-lg transition-all"
                >
                  {content.freeSampleButtonLabel === "Free Sample" ||
                  content.freeSampleButtonLabel.toLowerCase() === "click here to get free sample"
                    ? "CLICK HERE TO GET FREE SAMPLE"
                    : content.freeSampleButtonLabel.toUpperCase()}
                </button>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.08] text-foreground">
                Farm to <span className="text-primary">Home.</span>
                <br />
                Pure A2 Milk.
                <br />
                Pure <span className="text-primary">You.</span>
              </h1>
              <p className="mt-4 sm:mt-6 text-sm sm:text-base text-muted-foreground max-w-md mx-auto lg:mx-0">
                100% Natural Products Farm to Home — certified A2 Gir cow milk, buffalo milk, curd, paneer and ghee.
              </p>
              <div className="mt-6 sm:mt-8 flex flex-wrap gap-3 justify-center lg:justify-start">
                <Link
                  to="/products"
                  className="btn-press rounded-full bg-primary text-primary-foreground px-6 sm:px-7 py-2.5 sm:py-3 text-sm font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90"
                >
                  Order Now
                </Link>
                <Link
                  to="/subscription"
                  className="btn-press rounded-full border-2 border-primary text-primary px-6 sm:px-7 py-2.5 sm:py-3 text-sm font-semibold flex items-center gap-2 hover:bg-primary-soft"
                >
                  <Heart className="h-4 w-4" /> Subscribe & Save
                </Link>
              </div>
              <div className="mt-8 sm:mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-xl mx-auto lg:mx-0">
                {[
                  { icon: Milk, t: "100% A2", s: "Gir Cow Milk" },
                  { icon: Beef, t: "High Protein", s: "& Nutrition" },
                  { icon: Truck, t: "Farm Fresh", s: "Everyday" },
                  { icon: Leaf, t: "No Harmful", s: "Additives" },
                ].map((f, i) => (
                  <div
                    key={i}
                    className="group flex flex-col items-center lg:items-start text-center lg:text-left animate-fade-up"
                    style={{ animationDelay: `${150 + i * 90}ms` }}
                  >
                    <f.icon
                      className="h-8 w-8 sm:h-9 sm:w-9 text-primary mb-2 transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110"
                      strokeWidth={1.5}
                    />
                    <div className="text-xs sm:text-sm font-semibold text-foreground leading-tight">{f.t}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">{f.s}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="order-1 lg:order-2 animate-fade-up hero-banner-expand-wrap" style={{ animationDelay: "120ms" }}>
              <HeroBannerCarousel />
            </div>
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl px-3 sm:px-4 pb-10 sm:pb-12">
          <div className="bg-card/90 backdrop-blur-sm rounded-2xl border border-border shadow-sm px-4 sm:px-6 py-5 sm:py-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5 sm:gap-6">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <f.icon className="h-8 w-8 sm:h-9 sm:w-9 text-primary shrink-0" strokeWidth={1.5} />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-foreground">{f.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TrendingReelsSection productCategories={productCategories} />

      <ProductsSection productCategories={productCategories} layout="home-scroll" />

      <section className="px-4 pb-4">
        <div className="mx-auto max-w-7xl rounded-2xl bg-primary text-primary-foreground py-8 px-6 grid grid-cols-2 md:grid-cols-5 gap-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 milk-bubbles opacity-30 pointer-events-none" aria-hidden="true">
            <span className="milk-bubble milk-bubble-2 !top-[10%] !right-[5%]" />
            <span className="milk-bubble milk-bubble-4 !bottom-[15%] !left-[8%]" />
          </div>
          {[
            { icon: Heart, n: "500+", l: "Gir Cows" },
            { icon: Beef, n: "20+", l: "Farm Families" },
            { icon: Milk, n: "100%", l: "Pure & Natural" },
            { icon: Leaf, n: "A2", l: "Certified Milk" },
            { icon: Star, n: "4.9/5", l: "Customer Reviews" },
          ].map((s, i) => (
            <div key={i} className="relative z-[1] flex flex-col items-center">
              <s.icon className="h-7 w-7 mb-2" strokeWidth={1.5} />
              <div className="text-2xl font-extrabold">{s.n}</div>
              <div className="text-xs opacity-90">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="py-16">
        <div className="mx-auto max-w-7xl px-4 grid lg:grid-cols-[1.1fr_1fr_0.9fr] gap-8 items-start">
          <div className="relative rounded-2xl overflow-hidden group">
            <img
              src={farmStory}
              alt="Farmer with cows"
              width={1024}
              height={768}
              loading="lazy"
              className="w-full h-full object-cover"
            />
            <button className="absolute inset-0 grid place-items-center" aria-label="Play farm story">
              <span className="h-16 w-16 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-xl group-hover:scale-110 transition">
                <Play className="h-7 w-7 ml-1" fill="currentColor" />
              </span>
            </button>
            <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur rounded-full px-4 py-2 text-xs font-semibold flex items-center gap-2">
              <Play className="h-3 w-3 text-primary" fill="currentColor" /> Watch Our Farm Story
            </div>
          </div>
          <div>
            <div className="text-primary text-sm font-semibold mb-2">Who we are?</div>
            <h2 className="font-display text-3xl font-bold mb-4">About Us</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We started with a simple concept of providing milk that is pure, natural and unadulterated. Milk is an
              integral part of our lives — with all its nutrition and health benefits, drinking milk daily has been our
              tradition for a long time. As demand grew, so did concern over milk quality. We took this as a challenge
              and began delivering milk that is unadulterated, pure and safe to consume.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed mt-3">
              With a family of 20 farmers and 500+ Gir cows, we are on a mission to reach people looking for a healthy
              milk option. Our vision is to become the most trustable dairy farm in this growing A2 culture — educating
              and awaring maximum people about A2 milk and its benefits. Here, for a change.
            </p>
            <Link
              to="/about"
              className="mt-6 rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold inline-flex items-center gap-2 hover:bg-primary/90"
            >
              Know More About Us <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="bg-primary-soft/50 rounded-2xl p-6 space-y-5">
            {[
              {
                icon: Leaf,
                t: "Pure, Natural & Unadulterated",
                d: "Milk free from adulteration — safe and wholesome for your family.",
              },
              {
                icon: Beef,
                t: "500+ Gir Cows, 20 Farmers",
                d: "A dedicated farm family committed to quality A2 dairy.",
              },
              {
                icon: ShieldCheck,
                t: "Educating About A2 Benefits",
                d: "Spreading awareness about A2 milk and healthier choices.",
              },
            ].map((x, i) => (
              <div key={i} className="flex gap-3">
                <x.icon className="h-8 w-8 text-primary shrink-0" strokeWidth={1.5} />
                <div>
                  <div className="font-semibold text-primary text-sm">{x.t}</div>
                  <div className="text-xs text-muted-foreground mt-1">{x.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="subscription" className="pb-16">
        <div className="mx-auto max-w-7xl px-4 grid lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-primary text-primary-foreground overflow-hidden">
            <div className="grid sm:grid-cols-[1fr_minmax(0,11rem)] lg:grid-cols-[1fr_minmax(0,13rem)] gap-6 sm:gap-8 p-6 sm:p-8 items-center">
              <div className="min-w-0 order-2 sm:order-1">
                <h3 className="font-display text-2xl font-bold mb-2">Subscribe</h3>
                <p className="text-sm opacity-90 mb-4">Subscribe to our emails — be the first to know about new collections and exclusive offers.</p>
                <ul className="space-y-2 text-sm">
                  {[
                    "A2 Gir Cow Milk — from ₹46",
                    "Farm Fresh Buffalo Milk — from ₹46",
                    "High protein Milk — ₹80",
                    "High Protein Coffee — ₹85",
                  ].map((x) => (
                    <li key={x} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/subscription"
                  className="mt-6 inline-flex rounded-full bg-card text-primary px-6 py-2.5 text-sm font-semibold hover:bg-card/90"
                >
                  Start Subscription
                </Link>
              </div>
              <div className="order-1 sm:order-2 flex justify-center sm:justify-end">
                <img
                  src={bottle}
                  alt="Fresh milk subscription"
                  width={768}
                  height={768}
                  loading="lazy"
                  className="h-36 sm:h-44 lg:h-52 w-auto max-w-full object-contain rounded-xl"
                />
              </div>
            </div>
          </div>
          <div id="why" className="rounded-2xl border border-border bg-card p-8">
            <h3 className="font-display text-xl font-bold text-primary mb-6">Why Shrishti Dairy Farm</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
              {[
                { icon: Heart, t: "Trustable A2 Dairy" },
                { icon: Sparkles, t: "Pure & Unadulterated" },
                { icon: Leaf, t: "Farm Fresh Daily" },
                { icon: ShieldCheck, t: "Healthier Milk Choice" },
              ].map((x, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <x.icon className="h-10 w-10 text-primary" strokeWidth={1.5} />
                  <div className="text-xs font-semibold text-primary leading-tight">{x.t}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-primary-soft/30">
        <div className="mx-auto max-w-7xl px-4 py-8 grid md:grid-cols-[1fr_auto_auto] gap-6 items-center">
          <div>
            <h4 className="font-display text-lg font-bold text-primary">Subscribe to our emails</h4>
            <p className="text-xs text-muted-foreground">Be the first to know about new collections and exclusive offers.</p>
          </div>
          <form className="flex gap-2 w-full md:w-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 md:w-72 rounded-full border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              type="button"
              className="rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold"
            >
              Subscribe
            </button>
          </form>
          <div className="flex gap-5 text-xs">
            {[
              { icon: Truck, t: "Free Delivery", s: "On all subscriptions" },
              { icon: ShieldCheck, t: "Best Quality", s: "100% Quality Assured" },
              { icon: CheckCircle2, t: "Secure Payment", s: "100% Secure Payments" },
            ].map((x, i) => (
              <div key={i} className="flex items-center gap-2">
                <x.icon className="h-7 w-7 text-primary" strokeWidth={1.5} />
                <div>
                  <div className="font-semibold text-foreground">{x.t}</div>
                  <div className="text-muted-foreground">{x.s}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <FreeSampleModal open={freeSampleOpen} onOpenChange={setFreeSampleOpen} />
    </SiteShell>
  );
}
