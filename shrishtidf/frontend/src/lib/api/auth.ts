import type { ApiResponse } from "@/lib/api/response";
import { API_ROUTES } from "@/lib/api/response";
import { authHeaders, fetchOptions } from "@/lib/api/client";

export type CustomerProfile = {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  address: string | null;
  flatNo: string | null;
  societyName: string | null;
  streetName: string | null;
  landmark: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  ordersCount: number;
  leadsCount: number;
  lastSeenAt: string | null;
};

export type CustomerProfileInput = {
  name?: string;
  email?: string;
  flatNo?: string;
  societyName?: string;
  streetName?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
};

export type CustomerOrderSummary = {
  id: string;
  status: string;
  totalAmount: number;
  paymentStatus: string;
  createdAt: string | null;
  itemCount: number;
};

export type CustomerSession = {
  customer: CustomerProfile;
  orders: CustomerOrderSummary[];
};

async function parseJson<T>(res: Response): Promise<ApiResponse<T>> {
  return (await res.json()) as ApiResponse<T>;
}

export async function sendCustomerOtp(phone: string): Promise<{
  ok: boolean;
  debugOtp?: string;
  message?: string;
}> {
  try {
    const res = await fetch(API_ROUTES.authOtpSend, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeaders() },
      ...fetchOptions,
      body: JSON.stringify({ phone }),
    });
    const json = await parseJson<{ phone: string; expiresIn: number; debugOtp?: string }>(res);
    if (json.success) {
      return { ok: true, debugOtp: json.data.debugOtp };
    }
    return { ok: false, message: ((json as any).error?.message ?? (json as any).message) ?? "Unable to send OTP" };
  } catch {
    return { ok: false, message: "Network error. Please try again." };
  }
}

export async function verifyCustomerOtp(
  phone: string,
  otp: string,
): Promise<{ ok: boolean; customer?: CustomerProfile; message?: string }> {
  try {
    const res = await fetch(API_ROUTES.authOtpVerify, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeaders() },
      ...fetchOptions,
      body: JSON.stringify({ phone, otp }),
    });
    const json = await parseJson<{ customer: CustomerProfile }>(res);
    if (json.success) {
      return { ok: true, customer: json.data.customer };
    }
    return { ok: false, message: ((json as any).error?.message ?? (json as any).message) ?? "Invalid OTP" };
  } catch {
    return { ok: false, message: "Network error. Please try again." };
  }
}

export async function fetchCustomerSession(): Promise<CustomerSession | null> {
  try {
    const res = await fetch(API_ROUTES.authMe, {
      headers: { Accept: "application/json", ...authHeaders() },
      ...fetchOptions,
    });
    if (res.status === 401) return null;
    const json = await parseJson<CustomerSession>(res);
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export async function updateCustomerProfile(
  input: CustomerProfileInput,
): Promise<{ ok: boolean; customer?: CustomerProfile; message?: string }> {
  try {
    const res = await fetch(API_ROUTES.authProfile, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeaders() },
      ...fetchOptions,
      body: JSON.stringify(input),
    });
    const json = await parseJson<{ customer: CustomerProfile }>(res);
    if (json.success) {
      return { ok: true, customer: json.data.customer };
    }
    return { ok: false, message: ((json as any).error?.message ?? (json as any).message) ?? "Unable to update profile" };
  } catch {
    return { ok: false, message: "Network error. Please try again." };
  }
}

export async function logoutCustomer(): Promise<void> {
  try {
    await fetch(API_ROUTES.authLogout, {
      method: "POST",
      headers: { Accept: "application/json", ...authHeaders() },
      ...fetchOptions,
    });
  } catch {
    // ignore
  }
}
