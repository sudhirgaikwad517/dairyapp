type RazorpayHandlerResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayDisplayConfig = {
  display: {
    sequence: string[];
    preferences: {
      show_default_blocks: boolean;
    };
  };
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  config?: RazorpayDisplayConfig;
  webview_intent?: boolean;
  handler: (response: RazorpayHandlerResponse) => void;
  modal?: { ondismiss?: () => void };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: string, handler: () => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

let scriptPromise: Promise<void> | null = null;

export function isMobileWeb(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function razorpayPaymentHint(): string {
  if (isMobileWeb()) {
    return "Select UPI in Razorpay to open GPay, PhonePe, Paytm or other apps on your phone.";
  }
  return "On laptop/desktop, UPI shows a QR code — scan it with GPay or PhonePe on your phone. You can also pay by Card or Netbanking in the same window.";
}

function buildCheckoutConfig(): RazorpayDisplayConfig {
  return {
    display: {
      // Card & netbanking first — desktop users often prefer these over UPI QR.
      sequence: ["card", "upi", "netbanking", "wallet"],
      preferences: {
        show_default_blocks: true,
      },
    },
  };
}

export function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay is only available in the browser"));
  }
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout"));
    document.body.appendChild(script);
  });

  return scriptPromise;
}

export type RazorpayPaymentResult = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

export async function openRazorpayCheckout(input: {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  customerName: string;
  phone: string;
  email?: string | null;
}): Promise<RazorpayPaymentResult> {
  await loadRazorpayScript();

  if (!window.Razorpay) {
    throw new Error("Razorpay checkout is unavailable");
  }

  const mobile = isMobileWeb();

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: input.keyId,
      amount: input.amount,
      currency: input.currency,
      name: "Shrishti Dairy Farm",
      description: "Fresh dairy order",
      order_id: input.orderId,
      prefill: {
        name: input.customerName,
        contact: input.phone,
        email: input.email ?? undefined,
      },
      theme: { color: "#2d6a4f" },
      config: buildCheckoutConfig(),
      ...(mobile ? { webview_intent: true } : {}),
      handler(response) {
        resolve({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss() {
          reject(new Error("Payment cancelled"));
        },
      },
    });

    rzp.on("payment.failed", () => {
      reject(new Error("Payment failed"));
    });

    rzp.open();
  });
}
