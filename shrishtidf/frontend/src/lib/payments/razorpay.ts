/**
 * Razorpay checkout structure — add VITE_RAZORPAY_KEY_ID when enabling live payments.
 */
import { createRazorpayOrder } from "@/lib/api/content";

export type RazorpayCheckoutStub = {
  configured: boolean;
  message: string;
  orderId?: string;
  amount?: number;
  keyId?: string;
};

export async function prepareRazorpayCheckout(): Promise<RazorpayCheckoutStub> {
  const payload = await createRazorpayOrder();

  if (!payload) {
    return {
      configured: false,
      message: "Payment service unavailable. Continue with call-to-confirm order.",
    };
  }

  const { razorpay } = payload;

  if (!razorpay.configured) {
    return {
      configured: false,
      message: razorpay.message ?? "Add Razorpay API keys in backend .env to enable online payment.",
    };
  }

  return {
    configured: true,
    message: razorpay.message ?? "Razorpay ready — wire checkout UI when keys are added.",
    orderId: razorpay.orderId,
    amount: razorpay.amount,
    keyId: razorpay.keyId ?? import.meta.env.VITE_RAZORPAY_KEY_ID,
  };
}
