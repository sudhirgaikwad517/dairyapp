import { useCallback, useEffect, useRef, useState } from "react";

const banner1 = "/assets/banner-1.jpg";
const banner2 = "/assets/banner-2.jpg";
const banner3 = "/assets/banner-3.jpg";
const banner4 = "/assets/banner-4.jpg";

const SLIDE_INTERVAL_MS = 3000;

const slides = [
  {
    src: banner1,
    alt: "Fresh glass bottles of A2 milk on a blue background",
    badge: "25g",
    badgeSub: "PROTEIN\nPER BOTTLE",
  },
  {
    src: banner2,
    alt: "Gir cows grazing on a green farm pasture",
    badge: "100%",
    badgeSub: "A2 GIR COW MILK",
  },
  {
    src: banner3,
    alt: "Dairy farm with cows in open fields",
    badge: "FARM",
    badgeSub: "FRESH DAILY",
  },
  {
    src: banner4,
    alt: "Pure natural milk poured into a glass",
    badge: "0%",
    badgeSub: "PRESERVATIVES",
  },
] as const;

export function HeroBannerCarousel() {
  const [active, setActive] = useState(0);
  const paused = useRef(false);
  const touchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((index: number) => {
    setActive((index + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const id = window.setInterval(() => {
      if (!paused.current) {
        setActive((i) => (i + 1) % slides.length);
      }
    }, SLIDE_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, []);

  const pause = () => {
    paused.current = true;
  };

  const resume = () => {
    paused.current = false;
  };

  const pauseBrieflyOnTouch = () => {
    pause();
    if (touchTimeout.current) clearTimeout(touchTimeout.current);
    touchTimeout.current = setTimeout(resume, SLIDE_INTERVAL_MS * 2);
  };

  const slide = slides[active];

  return (
    <div
      className="hero-banner-carousel relative mx-auto w-full max-w-lg lg:max-w-none lg:w-full"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onTouchStart={pauseBrieflyOnTouch}
      aria-roledescription="carousel"
      aria-label="Promotional banners"
    >
      <div className="hero-banner-image-wrap relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-xl shadow-primary/10">
        <div className="relative w-full aspect-[4/3] sm:aspect-[16/11] lg:aspect-[4/3] bg-primary/10">
          {slides.map((item, i) => (
            <img
              key={item.src}
              src={item.src}
              alt={item.alt}
              width={1600}
              height={1067}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "auto"}
              className={`hero-banner-slide absolute inset-0 h-full w-full object-cover ${
                i === active ? "hero-banner-slide-active" : ""
              }`}
            />
          ))}
        </div>

        <div
          key={active}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 lg:top-8 lg:right-8 h-20 w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28 rounded-full bg-primary text-primary-foreground grid place-items-center text-center shadow-xl animate-float hero-banner-badge"
        >
          <div>
            <div className="text-xl sm:text-2xl font-extrabold">{slide.badge}</div>
            <div className="text-[9px] sm:text-[10px] font-semibold leading-tight whitespace-pre-line">{slide.badgeSub}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2" role="tablist" aria-label="Choose banner slide">
        {slides.map((item, i) => (
          <button
            key={item.src}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={`Show slide ${i + 1} of ${slides.length}`}
            onClick={() => goTo(i)}
            className={`hero-banner-dot ${i === active ? "hero-banner-dot-active" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
