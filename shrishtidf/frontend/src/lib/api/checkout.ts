import type { ApiResponse } from "@/lib/api/response";
import { API_ROUTES } from "@/lib/api/response";
import { fetchOptions } from "@/lib/api/client";

export type DeliverySlot = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
};

export type PincodeValidation = {
  serviceable: boolean;
  pincode: string;
  city: string | null;
  areaName: string | null;
  deliveryFee: number;
  minOrderValue: number;
  message: string | null;
};

export type CheckoutQuote = {
  subtotal: number;
  taxAmount: number;
  deliveryFee: number;
  totalAmount: number;
  minOrderValue: number;
  meetsMinimum: boolean;
  freeDeliveryThreshold: number;
  walletEnabled: boolean;
  pincode: PincodeValidation;
};

export type CheckoutOptions = {
  settings: {
    minOrderValue: number;
    freeDeliveryThreshold: number;
    walletEnabled: boolean;
    referralReward: number;
  };
  deliverySlots: DeliverySlot[];
};

export type PlaceOrderInput = {
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
};

export type RazorpayOrderResponse = {
  razorpay: {
    configured: boolean;
    keyId?: string;
    orderId?: string;
    amount?: number;
    currency?: string;
    message?: string;
  };
  payableAmount: number;
  quoteTotal: number;
};

export async function fetchCheckoutOptions(): Promise<CheckoutOptions | null> {
  try {
    const res = await fetch(API_ROUTES.checkoutOptions, { ...fetchOptions });
    const json = (await res.json()) as ApiResponse<CheckoutOptions>;
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export async function validatePincode(pincode: string): Promise<PincodeValidation | null> {
  try {
    const res = await fetch(API_ROUTES.checkoutValidatePincode, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      ...fetchOptions,
      body: JSON.stringify({ pincode }),
    });
    const json = (await res.json()) as ApiResponse<PincodeValidation>;
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export async function fetchCheckoutQuote(pincode: string): Promise<CheckoutQuote | null> {
  try {
    const res = await fetch(API_ROUTES.checkoutQuote, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      ...fetchOptions,
      body: JSON.stringify({ pincode }),
    });
    const json = (await res.json()) as ApiResponse<CheckoutQuote>;
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export async function createRazorpayOrder(
  pincode: string,
  walletAmount = 0,
): Promise<{ ok: true; data: RazorpayOrderResponse } | { ok: false; message: string }> {
  try {
    const res = await fetch(API_ROUTES.paymentsRazorpayOrder, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      ...fetchOptions,
      body: JSON.stringify({ pincode, walletAmount }),
    });
    const json = (await res.json()) as ApiResponse<RazorpayOrderResponse>;
    if (json.success) return { ok: true, data: json.data };
    return { ok: false, message: json.error?.message ?? "Unable to start online payment." };
  } catch {
    return { ok: false, message: "Network error while starting payment." };
  }
}

export async function placeCheckoutOrder(
  input: PlaceOrderInput,
): Promise<{ ok: boolean; order?: Record<string, unknown>; message?: string }> {
  try {
    const res = await fetch(API_ROUTES.checkoutPlace, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      ...fetchOptions,
      body: JSON.stringify(input),
    });
    const json = (await res.json()) as ApiResponse<Record<string, unknown>>;
    if (json.success) return { ok: true, order: json.data };
    return { ok: false, message: json.error?.message ?? "Checkout failed" };
  } catch {
    return { ok: false, message: "Network error" };
  }
}
