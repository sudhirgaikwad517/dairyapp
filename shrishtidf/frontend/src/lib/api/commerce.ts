import type { ApiResponse } from "@/lib/api/response";
import { API_ROUTES } from "@/lib/api/response";
import { fetchOptions } from "@/lib/api/client";

export type WalletSummary = {
  balance: number;
  transactions: {
    id: string;
    type: string;
    amount: number;
    balanceAfter: number;
    notes: string | null;
    createdAt: string | null;
  }[];
};

export type SubscriptionItem = {
  id: string;
  productId: string;
  productName: string;
  sizeLabel: string;
  frequency: string;
  quantity: number;
  status: string;
  nextDeliveryDate: string | null;
  pausedUntil: string | null;
  walletAutoDebit: boolean;
  hasPendingChange?: boolean;
  pendingQuantity?: number | null;
  changeEffectiveDate?: string | null;
};

export async function fetchWallet(): Promise<WalletSummary | null> {
  try {
    const res = await fetch(API_ROUTES.wallet, { headers: { Accept: "application/json" }, ...fetchOptions });
    if (res.status === 401) return null;
    const json = (await res.json()) as ApiResponse<WalletSummary>;
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export async function topUpWallet(amount: number): Promise<{ ok: boolean; balance?: number; message?: string }> {
  try {
    const res = await fetch(API_ROUTES.walletTopUp, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      ...fetchOptions,
      body: JSON.stringify({ amount }),
    });
    const json = (await res.json()) as ApiResponse<{ balance: number }>;
    if (json.success) return { ok: true, balance: json.data.balance };
    return { ok: false, message: json.error?.message };
  } catch {
    return { ok: false, message: "Network error" };
  }
}

export async function fetchSubscriptions(): Promise<SubscriptionItem[]> {
  try {
    const res = await fetch(API_ROUTES.subscriptions, { headers: { Accept: "application/json" }, ...fetchOptions });
    if (res.status === 401) return [];
    const json = (await res.json()) as ApiResponse<{ subscriptions: SubscriptionItem[] }>;
    return json.success ? json.data.subscriptions : [];
  } catch {
    return [];
  }
}

export async function pauseSubscription(id: string, pausedUntil?: string): Promise<boolean> {
  const res = await fetch(API_ROUTES.subscriptionPause(id), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...fetchOptions,
    body: JSON.stringify({ pausedUntil }),
  });
  const json = (await res.json()) as ApiResponse<unknown>;
  return json.success;
}

export async function resumeSubscription(id: string): Promise<boolean> {
  const res = await fetch(API_ROUTES.subscriptionResume(id), {
    method: "POST",
    headers: { Accept: "application/json" },
    ...fetchOptions,
  });
  const json = (await res.json()) as ApiResponse<unknown>;
  return json.success;
}

export async function cancelSubscription(id: string): Promise<boolean> {
  const res = await fetch(API_ROUTES.subscriptionCancel(id), {
    method: "POST",
    headers: { Accept: "application/json" },
    ...fetchOptions,
  });
  const json = (await res.json()) as ApiResponse<unknown>;
  return json.success;
}

export async function requestSubscriptionChange(
  id: string,
  changes: { quantity?: number; variantId?: string; frequency?: string }
): Promise<{ ok: boolean; effectiveFrom?: string; message?: string }> {
  const res = await fetch(API_ROUTES.subscriptionChangeRequest(id), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...fetchOptions,
    body: JSON.stringify(changes),
  });
  const json = (await res.json()) as ApiResponse<{ effectiveFrom: string }>;
  if (json.success) return { ok: true, effectiveFrom: json.data.effectiveFrom };
  return { ok: false, message: json.error?.message };
}
