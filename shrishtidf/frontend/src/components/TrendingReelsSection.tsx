import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { Play } from "lucide-react";

import type { ProductCategory, ProductItem } from "@/lib/types";

const fallbackPoster = "/assets/bottle.jpg";

function formatPrice(p: ProductItem) {
  // Match the reference style: show a single price (buy once).
  return `₹${p.buyOnce}`;
}

function guessVideoSrc(p: ProductItem) {
  return p.videoUrl ?? `/assets/reels/${p.id}.mp4`;
}

function guessPosterSrc(p: ProductItem) {
  return p.videoPoster ?? fallbackPoster;
}

function ReelCard({ product, href }: { product: ProductItem; href: string }) {
  const [videoOk, setVideoOk] = useState(true);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoSrc = guessVideoSrc(product);
  const posterSrc = guessPosterSrc(product);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoOk) return;

    el.muted = true;
    el.defaultMuted = true;

    const tryPlay = () => {
      if (!el.paused) return;
      void el.play().catch(() => undefined);
    };

    const onIntersect: IntersectionObserverCallback = (entries) => {
      const entry = entries[0];
      if (!entry) return;

      if (entry.isIntersecting) {
        tryPlay();
      } else {
        el.pause();
      }
    };

    const observer = new IntersectionObserver(onIntersect, {
      threshold: 0.15,
      rootMargin: "80px 0px",
    });

    el.addEventListener("loadeddata", tryPlay);
    el.addEventListener("canplay", tryPlay);
    observer.observe(el);

    // Retry once metadata is available for cards already on screen.
    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      tryPlay();
    }

    return () => {
      observer.disconnect();
      el.removeEventListener("loadeddata", tryPlay);
      el.removeEventListener("canplay", tryPlay);
    };
  }, [videoSrc, videoOk]);

  return (
    <Link to={href} className="reel-card group">
      <div className="reel-media">
        {videoOk ? (
          <video
            key={videoSrc}
            ref={videoRef}
            className="reel-video"
            src={videoSrc}
            muted
            loop
            playsInline
            autoPlay
            preload="auto"
            poster={posterSrc}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => setVideoOk(false)}
          />
        ) : (
          <img className="reel-video" src={posterSrc} alt={product.name} />
        )}

        <div className={`reel-overlay${playing ? " reel-overlay--playing" : ""}`} aria-hidden="true">
          <span className="reel-play">
            <Play className="h-4 w-4" />
          </span>
        </div>
      </div>

      <div className="reel-meta">
        <div className="reel-title" title={`${product.name} • ${product.size}`}>
          {product.name}
        </div>
        <div className="reel-price">{formatPrice(product)}</div>
      </div>
    </Link>
  );
}

type TrendingReelsSectionProps = {
  title?: string;
  productCategories: ProductCategory[];
  maxItems?: number;
};

export function TrendingReelsSection({
  title = "Trending at Shrishti Dairy Farm",
  productCategories,
  maxItems = 8,
}: TrendingReelsSectionProps) {
  const items = useMemo(() => {
    const flat = productCategories.flatMap((c) =>
      c.items.map((p) => ({ product: p, categoryId: c.id })),
    );

    return flat.filter((x) => !!x.product.videoUrl).slice(0, maxItems);
  }, [productCategories, maxItems]);

  if (items.length === 0) return null;

  return (
    <section className="trending-reels">
      <div className="mx-auto max-w-7xl px-4">
        <div className="trending-header">
          <h2 className="trending-title">{title}</h2>
          <p className="trending-subtitle">
            Farm-fresh stories — cows on pasture, dairy care, and pure milk from our Akurdi farm to your home.
          </p>
        </div>

        <div className="reel-rail" role="list">
          {items.map(({ product, categoryId }) => (
            <ReelCard
              key={product.id}
              product={product}
              href={`/products?category=${encodeURIComponent(categoryId)}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

