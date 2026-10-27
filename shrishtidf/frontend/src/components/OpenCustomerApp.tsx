import { useEffect } from "react";
import { Loader2 } from "lucide-react";

import { CUSTOMER_APP_URL } from "@/lib/mobile-app";

/** Leaves the website for the customer app (served by its own container at /app/). */
export function OpenCustomerApp() {
  useEffect(() => {
    window.location.replace(CUSTOMER_APP_URL);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
