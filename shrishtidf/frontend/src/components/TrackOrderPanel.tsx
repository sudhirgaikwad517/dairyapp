import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PackageSearch } from "lucide-react";

import { ContentCard } from "@/components/layout/ContentCard";
import { apiUrl, fetchOptions } from "@/lib/api/client";
import { API_ROUTES } from "@/lib/api/response";
import type { OrderDto } from "@/lib/api/types";

export function TrackOrderPanel() {
  const [searchParams] = useSearchParams();
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const preset = searchParams.get("order");
    if (preset) setOrderId(preset);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrder(null);

    const res = await fetch(apiUrl(API_ROUTES.orderById(orderId.trim())), fetchOptions);
    const json = await res.json();

    setLoading(false);
    if (!json.success) {
      setError("Order not found. Check your order ID and try again.");
      return;
    }
    setOrder(json.data);
  }

  return (
    <div className="space-y-6">
      <ContentCard>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <input
            required
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Enter your order ID"
            className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "Searching…" : "Track Order"}
          </button>
        </form>
      </ContentCard>

      {error && (
        <ContentCard>
          <p className="text-destructive text-sm">{error}</p>
        </ContentCard>
      )}

      {order && (
        <ContentCard>
          <div className="flex items-start gap-3 mb-6">
            <PackageSearch className="h-6 w-6 text-primary shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-xl font-bold">Order {order.id}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Status: <span className="font-semibold text-primary">{order.status}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Placed on {new Date(order.createdAt).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
          <ul className="space-y-3 border-t border-border pt-4">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 text-sm">
                <span>
                  {item.productName} · {item.size} × {item.quantity}
                </span>
                <span className="font-semibold">₹{item.lineTotal}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between font-bold text-lg mt-4 pt-4 border-t border-border">
            <span>Total</span>
            <span>₹{order.totalAmount}</span>
          </div>
        </ContentCard>
      )}
    </div>
  );
}
