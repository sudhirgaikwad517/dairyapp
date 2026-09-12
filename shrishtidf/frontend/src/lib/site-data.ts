import type { ProductCategory } from "./types";

export const CONTACT = {
  phones: ["7721881777", "9511731391"] as const,
  address:
    "BR2 437, 4th Floor, INOX Leisure Ltd, JAI GANESH VISION Mall, Akurdi Chowk, Shubhashri Residency, Ganga Nagar, Akurdi, Pune, Pimpri-Chinchwad, Maharashtra 411035",
};

/** Local farm & dairy reel clips in public/assets/reels/. */
export const PRODUCT_REEL_VIDEOS: Record<
  string,
  { videoUrl: string; videoPoster: string }
> = {
  "a2-half": {
    videoUrl: "/assets/reels/a2-half.mp4",
    videoPoster: "https://assets.mixkit.co/videos/47113/47113-thumb-720-2.jpg",
  },
  "a2-litre": {
    videoUrl: "/assets/reels/a2-litre.mp4",
    videoPoster: "https://assets.mixkit.co/videos/47114/47114-thumb-720-3.jpg",
  },
  "buffalo-half": {
    videoUrl: "/assets/reels/buffalo-half.mp4",
    videoPoster: "https://assets.mixkit.co/videos/47115/47115-thumb-720-2.jpg",
  },
  "buffalo-litre": {
    videoUrl: "/assets/reels/buffalo-litre.mp4",
    videoPoster: "https://assets.mixkit.co/videos/47116/47116-thumb-720-1.jpg",
  },
  "hp-plain": {
    videoUrl: "/assets/reels/hp-plain.mp4",
    videoPoster: "https://assets.mixkit.co/videos/20032/20032-thumb-720-0.jpg",
  },
  "hp-coffee": {
    videoUrl: "/assets/reels/hp-coffee.mp4",
    videoPoster: "https://assets.mixkit.co/videos/8426/8426-thumb-720-0.jpg",
  },
};

function withReelVideo<T extends { id: string }>(item: T) {
  const reel = PRODUCT_REEL_VIDEOS[item.id];
  return reel ? { ...item, ...reel } : item;
}

/** Fallback when PostgreSQL is not connected yet */
export const DEFAULT_PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    id: "a2",
    label: "A2 Milk",
    tile: "var(--tile-1)",
    subscriptionNote: "30 days subscription",
    items: [
      withReelVideo({
        id: "a2-half",
        name: "A2 Gir Cow Milk",
        size: "Half Litre",
        buyOnce: 46,
        subscription: 46,
        badge: "POPULAR",
      }),
      withReelVideo({
        id: "a2-litre",
        name: "A2 Gir Cow Milk",
        size: "1 Litre",
        buyOnce: 90,
        subscription: 83,
        badge: "BEST VALUE",
      }),
      { id: "a2-curd", name: "A2 Curd", size: "From", buyOnce: 45, subscription: 45, badge: "FRESH" },
      {
        id: "a2-paneer",
        name: "A2 Gir Cow Malai Paneer",
        size: "Per Pack",
        buyOnce: 180,
        subscription: 180,
        badge: "PREMIUM",
      },
      {
        id: "a2-ghee",
        name: "A2 Gir Cow Ghee",
        size: "From",
        buyOnce: 520,
        subscription: 520,
        badge: "PURE GHEE",
      },
    ],
  },
  {
    id: "buffalo",
    label: "Buffalo Milk",
    tile: "var(--tile-2)",
    subscriptionNote: "30 days subscription",
    items: [
      withReelVideo({
        id: "buffalo-half",
        name: "Farm Fresh Buffalo Milk",
        size: "Half Litre",
        buyOnce: 46,
        subscription: 46,
        badge: "FRESH",
      }),
      withReelVideo({
        id: "buffalo-litre",
        name: "Farm Fresh Buffalo Milk",
        size: "1 Litre",
        buyOnce: 90,
        subscription: 84,
        badge: "SAVE MORE",
      }),
    ],
  },
  {
    id: "high-protein",
    label: "High Protein",
    tile: "var(--tile-3)",
    subscriptionNote: "30 days subscription",
    items: [
      withReelVideo({
        id: "hp-plain",
        name: "High protein Milk",
        size: "Per Bottle",
        buyOnce: 80,
        subscription: 80,
        badge: "HIGH PROTEIN",
      }),
      withReelVideo({
        id: "hp-coffee",
        name: "High Protein Coffee",
        size: "Per Bottle",
        buyOnce: 85,
        subscription: 85,
        badge: "COFFEE BLEND",
      }),
    ],
  },
];

export const promoMessages = [
  "100% Natural Products — Farm to Home",
  "A2 Gir Cow Milk, Buffalo Milk, Curd, Paneer & Ghee",
  "Subscribe & save on every milk variety",
];

export const SESSION_COOKIE = "sdf_session";
