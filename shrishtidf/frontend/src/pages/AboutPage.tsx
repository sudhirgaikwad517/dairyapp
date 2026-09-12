import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

import { ContentCard } from "@/components/layout/ContentCard";
import { PageHero } from "@/components/layout/PageHero";
import { SiteShell } from "@/components/layout/SiteShell";

const SERVICE_AREAS = [
  "Ravet",
  "Punevale",
  "Kiwale",
  "Wakad",
  "Hinjewadi",
  "Pimple Saudagar",
  "Vishal Nagar",
  "Balewadi",
  "Kalewadi",
  "Park Street",
  "Blue Ridge",
  "Chinchwad",
  "Akurdi",
  "Nigdi",
  "Marunji",
  "Magarpatta",
  "Wagholi",
  "Kharadi",
  "Viman Nagar",
];

export function AboutPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="About Us"
        title="About Us"
        subtitle="Pure, natural and unadulterated milk — from our farm family to your home."
      />
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-8">
        <ContentCard>
          <p className="text-muted-foreground leading-relaxed">
            We started with a simple concept of providing milk that is pure, natural and unadulterated. Milk is an
            integral part of our lives — with all its nutrition values and health benefits, drinking milk daily has
            been our tradition from a long time. But as the demand of milk increased, the concern over milk quality has
            also increased. Many surveys say the maximum amount of milk consumed in India is mostly adulterated.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-4">
            So we took this as a challenge and started this initiative of providing milk that is unadulterated, pure and
            safe to consume. With a family of 20 farmers and 500+ Gir cows, we are running with a mission to reach out
            to people who are looking for a healthy milk option.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-4">
            Our vision is to become the most trustable dairy farm in this growing A2 culture. We are doing this by
            educating and awaring maximum people about A2 milk and its benefits. Here, for a change.
          </p>
        </ContentCard>
        <ContentCard>
          <h2 className="font-display text-xl font-bold mb-4 text-foreground">Area we Serve</h2>
          <div className="flex flex-wrap gap-2">
            {SERVICE_AREAS.map((area) => (
              <span
                key={area}
                className="rounded-full bg-primary-soft text-primary text-xs font-semibold px-3 py-1.5"
              >
                {area}
              </span>
            ))}
          </div>
        </ContentCard>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            "500+ A2 Gir cows",
            "20 farmer families",
            "Pure, natural & unadulterated",
          ].map((item) => (
            <ContentCard key={item}>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                {item}
              </div>
            </ContentCard>
          ))}
        </div>
        <div className="text-center">
          <Link
            to="/products"
            className="inline-flex rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:bg-primary/90"
          >
            Shop Our Products
          </Link>
        </div>
      </div>
    </SiteShell>
  );
}
