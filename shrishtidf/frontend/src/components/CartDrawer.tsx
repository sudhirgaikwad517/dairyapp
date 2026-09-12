import { useEffect, useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2, Wallet, X } from "lucide-react";

import type { CartDto } from "@/lib/api/types";
import {
  createRazorpayOrder,
  fetchCheckoutOptions,
  fetchCheckoutQuote,
  validatePincode,
  type CheckoutQuote,
  type DeliverySlot,
} from "@/lib/api/checkout";
import { fetchWallet } from "@/lib/api/commerce";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { formatCustomerAddress } from "@/lib/product-helpers";
import { openRazorpayCheckout, razorpayPaymentHint } from "@/lib/razorpay";

type CartDrawerProps = {
  cart: CartDto | null;
  open: boolean;
  onClose: () => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onPlaceOrder: (input: {
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
  }) => Promise<{ id: string } | null>;
};

const inputClass =
  "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary";

export function CartDrawer({
  cart,
  open,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onPlaceOrder,
}: CartDrawerProps) {
  const { customer, isLoggedIn } = useCustomerAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliverySlotId, setDeliverySlotId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "wallet" | "razorpay">("cod");
  const [walletBalance, setWalletBalance] = useState(0);
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [pincodeMsg, setPincodeMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [autofilled, setAutofilled] = useState(false);

  useEffect(() => {
    if (!open) return;

    fetchCheckoutOptions().then((opts) => {
      if (opts) setSlots(opts.deliverySlots);
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDeliveryDate(tomorrow.toISOString().slice(0, 10));
  }, [open]);

  useEffect(() => {
    if (!open || !customer) return;

    setName(customer.name ?? "");
    setPhone(customer.phone ?? "");
    setAddress(formatCustomerAddress(customer));
    setPincode(customer.pincode ?? "");
    setAutofilled(true);
  }, [open, customer]);

  useEffect(() => {
    if (!open || !isLoggedIn) {
      setWalletBalance(0);
      return;
    }

    fetchWallet().then((wallet) => {
      setWalletBalance(wallet?.balance ?? 0);
    });
  }, [open, isLoggedIn]);

  useEffect(() => {
    if (!open || pincode.length !== 6) {
      setQuote(null);
      return;
    }

    const t = setTimeout(async () => {
      const validation = await validatePincode(pincode);
      setPincodeMsg(validation?.serviceable ? null : validation?.message ?? null);
      if (validation?.serviceable) {
        setQuote(await fetchCheckoutQuote(pincode));
      } else {
        setQuote(null);
      }
    }, 400);

    return () => clearTimeout(t);
  }, [open, pincode, cart?.totalAmount]);

  if (!open) return null;

  const items = cart?.items ?? [];
  const minOrder = quote?.minOrderValue ?? quote?.pincode?.minOrderValue ?? 0;
  const canCheckout = quote?.meetsMinimum && quote.pincode.serviceable;
  const walletCoversOrder =
    paymentMethod === "wallet" && quote != null && walletBalance >= quote.totalAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCheckoutError(null);
    setSubmitting(true);

    const baseInput = {
      customerName: name,
      phone,
      address,
      pincode,
      deliveryDate,
      deliverySlotId: deliverySlotId || undefined,
    };

    try {
      if (paymentMethod === "razorpay") {
        const walletAmount = 0;
        const rzResult = await createRazorpayOrder(pincode, walletAmount);

        if (!rzResult.ok) {
          setCheckoutError(rzResult.message);
          return;
        }

        const rzOrder = rzResult.data;
        if (!rzOrder.razorpay.configured || !rzOrder.razorpay.keyId || !rzOrder.razorpay.orderId) {
          setCheckoutError(rzOrder.razorpay.message ?? "Online payment is not configured.");
          return;
        }

        const payment = await openRazorpayCheckout({
          keyId: rzOrder.razorpay.keyId,
          orderId: rzOrder.razorpay.orderId,
          amount: rzOrder.razorpay.amount ?? rzOrder.payableAmount * 100,
          currency: rzOrder.razorpay.currency ?? "INR",
          customerName: name,
          phone,
          email: customer?.email,
        });

        const order = await onPlaceOrder({
          ...baseInput,
          paymentMethod: "razorpay",
          razorpayOrderId: payment.razorpayOrderId,
          razorpayPaymentId: payment.razorpayPaymentId,
          razorpaySignature: payment.razorpaySignature,
        });

        if (order) {
          setOrderId(order.id);
          return;
        }

        setCheckoutError("Payment succeeded but order could not be placed. Contact support with your payment ID.");
        return;
      }

      const walletAmount =
        paymentMethod === "wallet" && quote
          ? Math.min(walletBalance, quote.totalAmount)
          : 0;

      if (paymentMethod === "wallet" && walletAmount < (quote?.totalAmount ?? 0)) {
        setCheckoutError(`Insufficient wallet balance. You have ₹${walletBalance}, need ₹${quote?.totalAmount}.`);
        return;
      }

      const order = await onPlaceOrder({
        ...baseInput,
        paymentMethod: paymentMethod === "wallet" ? "wallet" : "cod",
        walletAmount,
      });

      if (order) {
        setOrderId(order.id);
        return;
      }

      setCheckoutError("Unable to place order. Check PIN code and minimum order value.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Checkout failed";
      setCheckoutError(message === "Payment cancelled" ? "Payment was cancelled." : message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setOrderId(null);
    setCheckoutError(null);
    setAutofilled(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close cart" onClick={handleClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md milk-card shadow-2xl flex flex-col animate-fade-up border-l border-border">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2 font-display font-bold text-lg">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Your Cart
          </div>
          <button type="button" onClick={handleClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {orderId ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="h-16 w-16 rounded-full bg-primary-soft grid place-items-center mb-4">
              <ShoppingBag className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-display text-xl font-bold">Order placed!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Order ID: <span className="font-mono text-foreground">{orderId}</span>
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Fresh delivery scheduled. Invoice will be shared on WhatsApp.
            </p>
            <button type="button" onClick={handleClose} className="mt-8 rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold">
              Continue Shopping
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mb-3 opacity-40" />
            <p>Your cart is empty</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border border-border p-4">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.size}</div>
                      <div className="text-xs text-primary mt-1">
                        {item.purchaseType === "SUBSCRIPTION" ? "Subscription" : "Buy once"}
                      </div>
                    </div>
                    <button type="button" onClick={() => onRemoveItem(item.id)} className="text-muted-foreground hover:text-destructive shrink-0" aria-label="Remove item">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="h-8 w-8 rounded-full border border-border grid place-items-center" aria-label="Decrease quantity">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                      <button type="button" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="h-8 w-8 rounded-full border border-border grid place-items-center" aria-label="Increase quantity">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="font-bold">₹{item.lineTotal}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border px-5 py-4 space-y-3 max-h-[55vh] overflow-y-auto">
              {quote && (
                <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 text-sm space-y-1">
                  <div className="flex justify-between"><span>Subtotal</span><span>₹{quote.subtotal}</span></div>
                  {quote.taxAmount > 0 && <div className="flex justify-between"><span>GST</span><span>₹{quote.taxAmount}</span></div>}
                  <div className="flex justify-between"><span>Delivery</span><span>{quote.deliveryFee === 0 ? "FREE" : `₹${quote.deliveryFee}`}</span></div>
                  <div className="flex justify-between font-bold text-base pt-1 border-t border-primary/10"><span>Total</span><span>₹{quote.totalAmount}</span></div>
                  {!quote.meetsMinimum && minOrder > 0 && (
                    <p className="text-destructive text-xs">Minimum order ₹{minOrder} required</p>
                  )}
                </div>
              )}

              {isLoggedIn && quote?.walletEnabled && (
                <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground">
                  <Wallet className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    Wallet balance: <strong className="text-foreground">₹{walletBalance}</strong>
                  </span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                {autofilled && isLoggedIn && (
                  <p className="text-xs text-primary font-medium">Details filled from your account</p>
                )}
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputClass} />
                <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className={inputClass} />
                <textarea required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Delivery address" rows={2} className={`${inputClass} resize-none`} />
                <input required value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="PIN code (6 digits)" className={inputClass} inputMode="numeric" />
                {pincodeMsg && <p className="text-xs text-destructive">{pincodeMsg}</p>}

                <input type="date" required value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={inputClass} />

                {slots.length > 0 && (
                  <select value={deliverySlotId} onChange={(e) => setDeliverySlotId(e.target.value)} className={inputClass} required>
                    <option value="">Select delivery slot</option>
                    {slots.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                )}

                <div className="flex flex-wrap gap-2">
                  {(["cod", "razorpay", ...(isLoggedIn && quote?.walletEnabled ? (["wallet"] as const) : [])] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold border ${paymentMethod === m ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
                    >
                      {m === "cod" ? "Cash on delivery" : m === "wallet" ? "Dairy wallet" : "Pay online"}
                    </button>
                  ))}
                </div>

                {paymentMethod === "razorpay" && (
                  <p className="text-xs text-muted-foreground leading-relaxed rounded-lg border border-border bg-muted/30 px-3 py-2">
                    {razorpayPaymentHint()}
                  </p>
                )}

                {checkoutError && <p className="text-sm text-destructive">{checkoutError}</p>}

                <button
                  type="submit"
                  disabled={submitting || !canCheckout || (paymentMethod === "wallet" && !walletCoversOrder)}
                  className="w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
                >
                  {submitting
                    ? paymentMethod === "razorpay"
                      ? "Opening payment…"
                      : "Placing order…"
                    : paymentMethod === "razorpay"
                      ? "Pay & Place Order"
                      : "Place Order"}
                </button>
              </form>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
