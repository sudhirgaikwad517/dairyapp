import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Loader2, LogOut, Mail, MapPin, Package, Phone, User, Wallet } from "lucide-react";

import { ContentCard } from "@/components/layout/ContentCard";
import { PageHero } from "@/components/layout/PageHero";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { updateCustomerProfile, type CustomerProfile, type CustomerProfileInput } from "@/lib/api/auth";
import {
  cancelSubscription,
  fetchSubscriptions,
  fetchWallet,
  pauseSubscription,
  resumeSubscription,
  topUpWallet,
  type SubscriptionItem,
} from "@/lib/api/commerce";

const inputClass =
  "w-full rounded-xl border-2 border-primary/20 px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function profileToForm(customer: CustomerProfile): CustomerProfileInput {
  return {
    name: customer.name ?? "",
    email: customer.email ?? "",
    flatNo: customer.flatNo ?? "",
    societyName: customer.societyName ?? "",
    streetName: customer.streetName ?? "",
    landmark: customer.landmark ?? "",
    city: customer.city ?? "Pune",
    state: customer.state ?? "Maharashtra",
    pincode: customer.pincode ?? "",
  };
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
      <div>
        <div className="font-semibold">{label}</div>
        <div className="text-muted-foreground">{value}</div>
      </div>
    </li>
  );
}

export function AccountPage() {
  const { customer, orders, loading, isLoggedIn, logout, refresh } = useCustomerAuth();
  const [form, setForm] = useState<CustomerProfileInput>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchWallet().then((w) => setWalletBalance(w?.balance ?? 0));
    fetchSubscriptions().then(setSubscriptions);
  }, [isLoggedIn, saved]);

  if (loading) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-4xl px-4 py-24 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SiteShell>
    );
  }

  if (!isLoggedIn || !customer) {
    return <Navigate to="/login" replace />;
  }

  const startEdit = () => {
    setForm(profileToForm(customer));
    setEditing(true);
    setError(null);
    setSaved(false);
  };

  const updateField = (field: keyof CustomerProfileInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const result = await updateCustomerProfile({
      name: form.name?.trim(),
      email: form.email?.trim(),
      flatNo: form.flatNo?.trim(),
      societyName: form.societyName?.trim(),
      streetName: form.streetName?.trim(),
      landmark: form.landmark?.trim(),
      city: form.city?.trim(),
      state: form.state?.trim(),
      pincode: form.pincode?.trim(),
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.message ?? "Unable to save");
      return;
    }

    await refresh();
    setEditing(false);
    setSaved(true);
  };

  const addressLine = [
    customer.flatNo && `Flat/House ${customer.flatNo}`,
    customer.societyName && `Society ${customer.societyName}`,
    customer.streetName && `Street ${customer.streetName}`,
    customer.landmark && `Landmark ${customer.landmark}`,
    customer.city,
    customer.state,
    customer.pincode && `PIN ${customer.pincode}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <SiteShell>
      <PageHero
        eyebrow="My Account"
        title={customer.name ? `Hello, ${customer.name}` : "Your Account"}
        subtitle="Update your contact details and delivery address for faster checkout and doorstep delivery."
      />

      <div className="mx-auto max-w-5xl px-4 py-12 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <ContentCard>
          <div className="flex items-start justify-between gap-4 mb-6">
            <h2 className="font-display text-xl font-bold">Profile & Address</h2>
            {!editing && (
              <button
                type="button"
                onClick={startEdit}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Edit details
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">Personal details</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="account-name" className="block text-sm font-semibold mb-2">
                      Full Name
                    </label>
                    <input
                      id="account-name"
                      value={form.name ?? ""}
                      onChange={(e) => updateField("name", e.target.value)}
                      className={inputClass}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="account-email" className="block text-sm font-semibold mb-2">
                      Email
                    </label>
                    <input
                      id="account-email"
                      type="email"
                      value={form.email ?? ""}
                      onChange={(e) => updateField("email", e.target.value)}
                      className={inputClass}
                      placeholder="you@email.com"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold mb-2">Mobile</label>
                    <input
                      value={`+91 ${customer.phone}`}
                      disabled
                      className={`${inputClass} opacity-70 cursor-not-allowed`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">Delivery address</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="account-flat" className="block text-sm font-semibold mb-2">
                      Flat / House No.
                    </label>
                    <input
                      id="account-flat"
                      value={form.flatNo ?? ""}
                      onChange={(e) => updateField("flatNo", e.target.value)}
                      className={inputClass}
                      placeholder="e.g. A-402"
                    />
                  </div>
                  <div>
                    <label htmlFor="account-society" className="block text-sm font-semibold mb-2">
                      Society / Building
                    </label>
                    <input
                      id="account-society"
                      value={form.societyName ?? ""}
                      onChange={(e) => updateField("societyName", e.target.value)}
                      className={inputClass}
                      placeholder="e.g. Green Valley Society"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="account-street" className="block text-sm font-semibold mb-2">
                      Street / Road
                    </label>
                    <input
                      id="account-street"
                      value={form.streetName ?? ""}
                      onChange={(e) => updateField("streetName", e.target.value)}
                      className={inputClass}
                      placeholder="e.g. Akurdi-Chinchwad Road"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="account-landmark" className="block text-sm font-semibold mb-2">
                      Landmark
                    </label>
                    <input
                      id="account-landmark"
                      value={form.landmark ?? ""}
                      onChange={(e) => updateField("landmark", e.target.value)}
                      className={inputClass}
                      placeholder="Near temple, mall, etc."
                    />
                  </div>
                  <div>
                    <label htmlFor="account-city" className="block text-sm font-semibold mb-2">
                      City
                    </label>
                    <input
                      id="account-city"
                      value={form.city ?? ""}
                      onChange={(e) => updateField("city", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="account-state" className="block text-sm font-semibold mb-2">
                      State
                    </label>
                    <input
                      id="account-state"
                      value={form.state ?? ""}
                      onChange={(e) => updateField("state", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="account-pincode" className="block text-sm font-semibold mb-2">
                      PIN Code
                    </label>
                    <input
                      id="account-pincode"
                      inputMode="numeric"
                      maxLength={6}
                      value={form.pincode ?? ""}
                      onChange={(e) => updateField("pincode", e.target.value.replace(/\D/g, ""))}
                      className={inputClass}
                      placeholder="6 digits"
                    />
                  </div>
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving} className="rounded-full">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save details"}
                </Button>
                <Button type="button" variant="outline" className="rounded-full" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <ul className="space-y-4 text-sm">
                <DetailRow icon={User} label="Name" value={customer.name || "Not added yet"} />
                <DetailRow icon={Mail} label="Email" value={customer.email || "Not added yet"} />
                <DetailRow icon={Phone} label="Mobile" value={`+91 ${customer.phone}`} />
              </ul>

              <div className="border-t border-border pt-5">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> Delivery address
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <span className="font-semibold text-foreground">Flat/House:</span>{" "}
                    {customer.flatNo || "—"}
                  </li>
                  <li>
                    <span className="font-semibold text-foreground">Society:</span>{" "}
                    {customer.societyName || "—"}
                  </li>
                  <li>
                    <span className="font-semibold text-foreground">Street:</span>{" "}
                    {customer.streetName || "—"}
                  </li>
                  <li>
                    <span className="font-semibold text-foreground">Landmark:</span>{" "}
                    {customer.landmark || "—"}
                  </li>
                  <li>
                    <span className="font-semibold text-foreground">City:</span> {customer.city || "—"}
                  </li>
                  <li>
                    <span className="font-semibold text-foreground">State:</span> {customer.state || "—"}
                  </li>
                  <li>
                    <span className="font-semibold text-foreground">PIN:</span> {customer.pincode || "—"}
                  </li>
                </ul>
                {addressLine && (
                  <p className="mt-4 text-sm rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 text-foreground">
                    {addressLine}
                  </p>
                )}
              </div>
            </div>
          )}

          {saved && !editing && (
            <p className="mt-4 text-sm text-green-700">Profile updated successfully.</p>
          )}

          <div className="mt-8 pt-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="rounded-full w-full"
              onClick={() => logout()}
            >
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </div>
        </ContentCard>

        <ContentCard>
          <div className="flex items-center gap-2 mb-6">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-bold">Recent Orders</h2>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-muted-foreground">No orders yet on this number.</p>
              <Link to="/products" className="inline-block text-sm font-semibold text-primary hover:underline">
                Browse products
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="rounded-2xl border border-border bg-card/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-semibold text-sm">Order #{order.id.slice(0, 8)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(order.createdAt)} · {order.itemCount} item(s)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">₹{order.totalAmount}</div>
                    <div className="text-xs text-muted-foreground">{formatStatus(order.status)}</div>
                  </div>
                  <Link
                    to={`/track-order?order=${order.id}`}
                    className="w-full text-center text-xs font-semibold text-primary hover:underline sm:w-auto"
                  >
                    Track order
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ContentCard>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-12 grid gap-6 lg:grid-cols-2">
        <ContentCard>
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-bold">Dairy Wallet</h2>
          </div>
          <p className="text-3xl font-bold text-primary mb-2">₹{walletBalance}</p>
          <p className="text-sm text-muted-foreground mb-4">Pre-fund your wallet for daily milk subscription auto-debit.</p>
          <Button
            type="button"
            disabled={walletLoading}
            className="rounded-full"
            onClick={async () => {
              setWalletLoading(true);
              const result = await topUpWallet(500);
              setWalletLoading(false);
              if (result.ok && result.balance !== undefined) setWalletBalance(result.balance);
            }}
          >
            {walletLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add ₹500 (demo top-up)"}
          </Button>
        </ContentCard>

        <ContentCard>
          <h2 className="font-display text-xl font-bold mb-4">My Subscriptions</h2>
          {subscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active subscriptions. Add subscription items from product pages.</p>
          ) : (
            <ul className="space-y-3">
              {subscriptions.map((sub) => (
                <li key={sub.id} className="rounded-xl border border-border p-3 text-sm">
                  <div className="font-semibold">{sub.productName} · {sub.sizeLabel}</div>
                  <div className="text-xs text-muted-foreground capitalize">{sub.frequency} · {sub.status}</div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {sub.status === "active" && (
                      <button type="button" className="text-xs text-primary font-semibold" onClick={async () => { await pauseSubscription(sub.id); setSubscriptions(await fetchSubscriptions()); }}>
                        Pause (vacation)
                      </button>
                    )}
                    {sub.status === "paused" && (
                      <button type="button" className="text-xs text-primary font-semibold" onClick={async () => { await resumeSubscription(sub.id); setSubscriptions(await fetchSubscriptions()); }}>
                        Resume
                      </button>
                    )}
                    {sub.status !== "cancelled" && (
                      <button type="button" className="text-xs text-destructive font-semibold" onClick={async () => { await cancelSubscription(sub.id); setSubscriptions(await fetchSubscriptions()); }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ContentCard>
      </div>
    </SiteShell>
  );
}
