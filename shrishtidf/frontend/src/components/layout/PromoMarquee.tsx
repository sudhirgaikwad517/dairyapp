import { promoMessages as defaultPromoMessages } from "@/lib/site-data";

type PromoMarqueeProps = {
  messages?: string[];
};

export function PromoMarquee({ messages }: PromoMarqueeProps) {
  const source = messages && messages.length > 0 ? messages : defaultPromoMessages;
  const items = [...source, ...source];
  return (
    <div className="promo-marquee" aria-live="polite">
      <div className="promo-marquee-track">
        {items.map((msg, i) => (
          <span key={i} className="promo-marquee-item">
            {msg}
          </span>
        ))}
      </div>
    </div>
  );
}
