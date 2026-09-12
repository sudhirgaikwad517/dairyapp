import { Link } from "react-router-dom";
import { CheckCircle2, Heart } from "lucide-react";

import { ContentCard } from "@/components/layout/ContentCard";
import { PageHero } from "@/components/layout/PageHero";
import { SiteShell } from "@/components/layout/SiteShell";

const plans = [
  { name: "A2 Gir Cow Milk 1L", price: "From ₹46", save: "Half litre & 1 litre packs" },
  { name: "Farm Fresh Buffalo Milk 1L", price: "From ₹46", save: "Half litre & 1 litre packs" },
  { name: "High protein Milk", price: "₹80/bottle", save: "Farm fresh high protein" },
  { name: "High Protein Coffee", price: "₹85/bottle", save: "Protein with coffee flavour" },
  { name: "A2 Curd, Paneer & Ghee", price: "From ₹45", save: "Curd, paneer & ghee available" },
];

export function SubscriptionPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Subscribe"
        title="Subscribe"
        subtitle="Be the first to know about new collections and exclusive offers on farm-fresh A2 dairy."
      />
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-8">
        <ContentCard>
          <div className="flex items-center gap-2 mb-4">
            <Heart className="h-6 w-6 text-primary" />
            <h2 className="font-display text-xl font-bold">How it works</h2>
          </div>
          <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
            <li>Choose your milk and add subscription items to cart.</li>
            <li>Complete checkout with your delivery address.</li>
            <li>Enjoy fresh milk every morning for 30 days.</li>
            <li>Renew, pause, or cancel before the next billing cycle.</li>
          </ol>
        </ContentCard>
        <div className="grid sm:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <ContentCard key={plan.name}>
              <h3 className="font-semibold text-foreground">{plan.name}</h3>
              <div className="text-2xl font-extrabold text-primary mt-2">{plan.price}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                {plan.save}
              </p>
            </ContentCard>
          ))}
        </div>
        <div className="text-center">
          <Link
            to="/products"
            className="inline-flex rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:bg-primary/90"
          >
            Start Subscription
          </Link>
        </div>
      </div>
    </SiteShell>
  );
}
