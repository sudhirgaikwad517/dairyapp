import { useEffect } from "react";
import { Loader2 } from "lucide-react";

import { CUSTOMER_APP_URL } from "@/lib/mobile-app";

/** Leaves the website for the customer app (served by its own container at /app/). */
export function OpenCustomerApp() {
  useEffect(() => {
    // Showing on /app itself means an older website service worker answered the app's address with the
    // website (it would loop forever): remove it, then load the app from the server
    if (window.location.pathname.startsWith("/app") && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .finally(() => window.location.replace(CUSTOMER_APP_URL));
      return;
    }
    window.location.replace(CUSTOMER_APP_URL);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
