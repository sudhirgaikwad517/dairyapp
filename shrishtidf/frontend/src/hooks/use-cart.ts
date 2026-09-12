import { useCallback, useEffect, useState } from "react";

import { apiUrl, fetchOptions } from "@/lib/api/client";
import type { CartDto, OrderDto } from "@/lib/api/types";
import { API_ROUTES } from "@/lib/api/response";
import { placeCheckoutOrder } from "@/lib/api/checkout";

const CART_STORAGE_KEY = "sdf_cart_snapshot";

type UseCartResult = {
  cart: CartDto | null;
  loading: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  itemCount: number;
  syncCart: () => Promise<void>;
  addItem: (
    productId: string,
    purchaseType?: "BUY_ONCE" | "SUBSCRIPTION",
    openCart?: boolean,
    variantId?: string,
  ) => Promise<boolean>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  placeOrder: (input: {
    customerName: string;
    phone: string;
    address: string;
    pincode: string;
    deliveryDate?: string;
    deliverySlotId?: string;
    paymentMethod?: "cod" | "upi" | "card" | "wallet" | "razorpay";
    walletAmount?: number;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
  }) => Promise<OrderDto | null>;
};

function readStoredCart(): CartDto | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CART_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartDto) : null;
  } catch {
    return null;
  }
}

function persistCart(cart: CartDto | null) {
  if (typeof window === "undefined" || !cart) return;
  try {
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    /* ignore quota errors */
  }
}

async function parseCartResponse(res: Response): Promise<CartDto | null> {
  const json = await res.json();
  return json.success ? json.data : null;
}

export function useCart(): UseCartResult {
  const [cart, setCartState] = useState<CartDto | null>(() => readStoredCart());
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const setCart = useCallback((next: CartDto | null) => {
    setCartState(next);
    persistCart(next);
  }, []);

  const syncCart = useCallback(async () => {
    const res = await fetch(apiUrl(API_ROUTES.cart), { ...fetchOptions, cache: "no-store" });
    const data = await parseCartResponse(res);
    if (data) setCart(data);
  }, [setCart]);

  useEffect(() => {
    const run = () => {
      setLoading(true);
      syncCart().finally(() => setLoading(false));
    };

    const w = globalThis as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof w.requestIdleCallback === "function" && typeof w.cancelIdleCallback === "function") {
      const id = w.requestIdleCallback(run, { timeout: 3000 });
      return () => w.cancelIdleCallback?.(id);
    }

    const id = setTimeout(run, 1500);
    return () => clearTimeout(id);
  }, [syncCart]);

  const addItem = useCallback(
    async (
      productId: string,
      purchaseType: "BUY_ONCE" | "SUBSCRIPTION" = "BUY_ONCE",
      openCart = false,
      variantId?: string,
    ) => {
      if (openCart) setOpen(true);

      const res = await fetch(apiUrl(API_ROUTES.cart), {
        ...fetchOptions,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          purchaseType,
          quantity: 1,
          ...(variantId ? { variantId } : {}),
        }),
      });
      const data = await parseCartResponse(res);
      if (!data) return false;
      setCart(data);
      return true;
    },
    [setCart],
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      const res = await fetch(apiUrl(API_ROUTES.cartItem(itemId)), {
        ...fetchOptions,
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      const data = await parseCartResponse(res);
      if (data) setCart(data);
    },
    [setCart],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      const res = await fetch(apiUrl(API_ROUTES.cartItem(itemId)), { ...fetchOptions, method: "DELETE" });
      const data = await parseCartResponse(res);
      if (data) setCart(data);
    },
    [setCart],
  );

  const clearCart = useCallback(async () => {
    const res = await fetch(apiUrl(API_ROUTES.cart), { ...fetchOptions, method: "DELETE" });
    const data = await parseCartResponse(res);
    if (data) setCart(data);
  }, [setCart]);

  const placeOrder = useCallback(
    async (input: {
      customerName: string;
      phone: string;
      address: string;
      pincode: string;
      deliveryDate?: string;
      deliverySlotId?: string;
      paymentMethod?: "cod" | "upi" | "card" | "wallet" | "razorpay";
      walletAmount?: number;
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
    }) => {
      const result = await placeCheckoutOrder(input);
      if (!result.ok || !result.order) return null;
      setCart(null);
      sessionStorage.removeItem(CART_STORAGE_KEY);
      await syncCart();
      return result.order as OrderDto;
    },
    [syncCart, setCart],
  );

  return {
    cart,
    loading,
    open,
    setOpen,
    itemCount: cart?.itemCount ?? 0,
    syncCart,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    placeOrder,
  };
}
