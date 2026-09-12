import { useEffect, useRef, useState, type RefObject } from "react";

type Options = {
  threshold?: number;
};

/** Pins an element at the viewport top while scrolling down, after it has scrolled out of view. */
export function useScrollUpPinned(
  ref: RefObject<HTMLElement | null>,
  { threshold = 10 }: Options = {},
) {
  const [pinned, setPinned] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY.current;

      if (Math.abs(delta) < threshold) return;

      const rect = el.getBoundingClientRect();
      const pastElement = rect.bottom <= 0;
      const railInView = rect.top >= 0 && rect.top < window.innerHeight;

      if (delta > 0 && pastElement) {
        setPinned(true);
      } else if (delta < 0 || railInView) {
        setPinned(false);
      }

      lastY.current = y;
    };

    const onResize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
        setPinned(false);
      }
    };

    lastY.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [ref, threshold]);

  return pinned;
}
