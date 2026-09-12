import { useEffect, useRef, useState, type ReactNode } from "react";

const STORAGE_KEY = "sdf_splash_shown";
const MIN_DURATION_MS = 1400;

type MilkFillLoaderProps = {
  children: ReactNode;
};

export function MilkFillLoader({ children }: MilkFillLoaderProps) {
  const [show, setShow] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem(STORAGE_KEY);
  });
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);
  const finished = useRef(false);

  useEffect(() => {
    if (!show || finished.current) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setShow(false);
      return;
    }

    let raf = 0;
    const started = performance.now();
    let loaded = document.readyState === "complete";

    const finish = () => {
      if (finished.current) return;
      finished.current = true;
      setProgress(100);
      setExiting(true);
      window.setTimeout(() => {
        sessionStorage.setItem(STORAGE_KEY, "1");
        setShow(false);
      }, 450);
    };

    const onLoad = () => {
      loaded = true;
    };
    window.addEventListener("load", onLoad);

    const tick = (now: number) => {
      const elapsed = now - started;
      const timeRatio = Math.min(1, elapsed / MIN_DURATION_MS);
      const next = loaded
        ? 88 + 12 * Math.min(1, (elapsed - MIN_DURATION_MS * 0.6) / (MIN_DURATION_MS * 0.4))
        : 88 * timeRatio;

      setProgress(Math.min(100, Math.max(0, next)));

      if (loaded && elapsed >= MIN_DURATION_MS) {
        finish();
        return;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("load", onLoad);
    };
  }, [show]);

  return (
    <>
      {children}
      {show && (
        <div
          className={`milk-fill-loader${exiting ? " milk-fill-loader--exit" : ""}`}
          role="status"
          aria-live="polite"
          aria-label="Loading Shrishti Dairy Farm"
        >
          <div className="milk-fill-loader__circle">
            <div className="milk-fill-loader__milk" style={{ height: `${progress}%` }}>
              <div className="milk-fill-loader__wave" aria-hidden="true" />
            </div>
            <img
              src="/assets/logo.webp"
              alt=""
              className="milk-fill-loader__logo"
              width={120}
              height={120}
            />
          </div>
          <p className="milk-fill-loader__tagline">Farm Fresh Certified A2 Milk</p>
        </div>
      )}
    </>
  );
}
