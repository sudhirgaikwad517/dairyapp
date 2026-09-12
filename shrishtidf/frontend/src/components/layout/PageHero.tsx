import { MilkBubbles, MilkWaveDivider } from "@/components/MilkDecor";

type PageHeroProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  compact?: boolean;
};

export function PageHero({ title, subtitle, eyebrow, compact = false }: PageHeroProps) {
  return (
    <section className="milk-page-hero relative overflow-hidden border-b border-border">
      <MilkBubbles className="absolute inset-0" />
      <div
        className={`relative mx-auto max-w-7xl px-4 text-center ${
          compact ? "pt-4 pb-3 sm:pt-8 sm:pb-5" : "py-12 sm:py-16"
        }`}
      >
        {eyebrow && (
          <p
            className={`inline-flex items-center gap-2 rounded-full bg-white/70 border border-primary/15 text-primary text-xs font-bold tracking-wide uppercase px-3 py-1 ${
              compact ? "mb-2 sm:mb-3" : "mb-4"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            {eyebrow}
          </p>
        )}
        <h1
          className={`font-display font-bold text-foreground ${
            compact ? "text-2xl sm:text-4xl md:text-5xl" : "text-3xl sm:text-4xl md:text-5xl"
          }`}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className={`text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base ${
              compact ? "mt-2 sm:mt-3 leading-snug" : "mt-4"
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>
      <MilkWaveDivider compact={compact} />
    </section>
  );
}
