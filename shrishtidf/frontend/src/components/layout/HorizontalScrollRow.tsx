import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type HorizontalScrollRowProps = {
  children: ReactNode;
  variant?: "dark" | "light";
  trackClassName?: string;
  className?: string;
  /** When false, hides mobile chevron buttons (touch swipe only). */
  showScrollButtons?: boolean;
} & Pick<ComponentPropsWithoutRef<"nav">, "aria-label"> &
  ({ as?: "div" } | { as: "nav"; "aria-label": string });

export function HorizontalScrollRow({
  children,
  variant = "light",
  trackClassName,
  className,
  showScrollButtons = true,
  as = "div",
  "aria-label": ariaLabel,
}: HorizontalScrollRowProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const maxScroll = track.scrollWidth - track.clientWidth;
    setCanScrollLeft(track.scrollLeft > 4);
    setCanScrollRight(track.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    updateScrollState();

    const observer = new ResizeObserver(updateScrollState);
    observer.observe(track);
    track.addEventListener("scroll", updateScrollState, { passive: true });

    return () => {
      observer.disconnect();
      track.removeEventListener("scroll", updateScrollState);
    };
  }, [updateScrollState, children]);

  const scrollByDirection = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;

    track.scrollBy({
      left: direction * Math.max(track.clientWidth * 0.72, 140),
      behavior: "smooth",
    });
  };

  const TrackTag = as === "nav" ? "nav" : "div";
  const btnClass =
    variant === "dark" ? "horizontal-scroll-btn horizontal-scroll-btn-dark" : "horizontal-scroll-btn horizontal-scroll-btn-light";

  return (
    <div className={cn("horizontal-scroll-row", className)}>
      {showScrollButtons && (
        <button
          type="button"
          className={cn(btnClass, "md:hidden")}
          onClick={() => scrollByDirection(-1)}
          disabled={!canScrollLeft}
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
        </button>
      )}

      <TrackTag
        ref={trackRef}
        className={cn("horizontal-scroll-track", trackClassName)}
        aria-label={as === "nav" ? ariaLabel : undefined}
      >
        {children}
      </TrackTag>

      {showScrollButtons && (
        <button
          type="button"
          className={cn(btnClass, "md:hidden")}
          onClick={() => scrollByDirection(1)}
          disabled={!canScrollRight}
          aria-label="Scroll right"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
