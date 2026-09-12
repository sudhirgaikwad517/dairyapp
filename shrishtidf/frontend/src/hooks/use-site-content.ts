import { useEffect, useState } from "react";

import { fetchSiteContent, type SiteContentDto } from "@/lib/api/content";
import { promoMessages as fallbackPromo } from "@/lib/site-data";

const FALLBACK: SiteContentDto = {
  heroBadge: "100% NATURAL PRODUCTS",
  freeSampleButtonLabel: "CLICK HERE TO GET FREE SAMPLE",
  whatsappNumber: "7721881777",
  promoMessages: fallbackPromo,
};

export function useSiteContent() {
  const [content, setContent] = useState<SiteContentDto>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchSiteContent().then((data) => {
      if (!active) return;
      if (data) setContent(data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { content, loading };
}
