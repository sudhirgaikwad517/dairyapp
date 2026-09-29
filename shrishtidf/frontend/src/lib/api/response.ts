/**
 * Standard API response envelope for web + mobile clients.
 */
export type ApiMeta = {
  timestamp: string;
  version: "v1";
};

export type ApiErrorBody = {
  code: string;
  message: string;
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  meta: ApiMeta;
};

export type ApiErrorResponse = {
  success: false;
  error: ApiErrorBody;
  meta: ApiMeta;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export const API_VERSION = "v1" as const;

export const API_ROUTES = {
  health: "/api/v1/health",
  products: "/api/v1/products",
  productById: (id: string) => `/api/v1/products/${id}`,
  categories: "/api/v1/categories",
  categoryById: (id: string) => `/api/v1/categories/${id}`,
  contact: "/api/v1/contact",
  cart: "/api/v1/cart",
  cartItem: (id: string) => `/api/v1/cart/items/${id}`,
  orders: "/api/v1/orders",
  orderById: (id: string) => `/api/v1/orders/${id}`,
  siteContent: "/api/v1/site-content",
  blogs: "/api/v1/blogs",
  blogBySlug: (slug: string) => `/api/v1/blogs/${slug}`,
  leads: "/api/v1/leads",
  paymentsRazorpayOrder: "/api/v1/payments/razorpay/order",
  paymentsRazorpayVerify: "/api/v1/payments/razorpay/verify",
  authOtpSend: "/api/v1/auth/otp/send",
  authOtpVerify: "/api/v1/auth/otp/verify",
  authMe: "/api/v1/auth/me",
  authProfile: "/api/v1/auth/profile",
  authLogout: "/api/v1/auth/logout",
  checkoutOptions: "/api/v1/checkout/options",
  checkoutValidatePincode: "/api/v1/checkout/validate-pincode",
  checkoutQuote: "/api/v1/checkout/quote",
  checkoutPlace: "/api/v1/checkout/place",
  wallet: "/api/v1/wallet",
  walletTopUp: "/api/v1/wallet/top-up",
  subscriptions: "/api/v1/subscriptions",
  subscriptionPause: (id: string) => `/api/v1/subscriptions/${id}/pause`,
  subscriptionResume: (id: string) => `/api/v1/subscriptions/${id}/resume`,
  subscriptionCancel: (id: string) => `/api/v1/subscriptions/${id}/cancel`,
  subscriptionChangeRequest: (id: string) => `/api/v1/subscriptions/${id}/change-request`,
} as const;

function meta(): ApiMeta {
  return { timestamp: new Date().toISOString(), version: API_VERSION };
}

const CACHE_HEADERS = {
  publicCatalog: {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  },
  privateSession: {
    "Cache-Control": "private, no-store",
  },
} as const;

export function apiSuccess<T>(data: T, init?: ResponseInit): Response {
  const body: ApiSuccessResponse<T> = { success: true, data, meta: meta() };
  return Response.json(body, { status: 200, ...init });
}

export function apiSuccessCached<T>(data: T, init?: ResponseInit): Response {
  return apiSuccess(data, {
    headers: CACHE_HEADERS.publicCatalog,
    ...init,
  });
}

export function apiError(
  code: string,
  message: string,
  status = 400,
  init?: ResponseInit,
): Response {
  const body: ApiErrorResponse = {
    success: false,
    error: { code, message },
    meta: meta(),
  };
  return Response.json(body, { status, ...init });
}
