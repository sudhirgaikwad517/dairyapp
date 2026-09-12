import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Loader2, Phone, ShieldCheck } from "lucide-react";

import { ContentCard } from "@/components/layout/ContentCard";
import { PageHero } from "@/components/layout/PageHero";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { sendCustomerOtp, verifyCustomerOtp } from "@/lib/api/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const { isLoggedIn, setCustomer, refresh } = useCustomerAuth();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoggedIn) {
    return <Navigate to="/account" replace />;
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await sendCustomerOtp(phone.trim());
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message ?? "Unable to send OTP");
      return;
    }

    setDebugOtp(result.debugOtp ?? null);
    setStep("otp");
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await verifyCustomerOtp(phone.trim(), otp.trim());
    setSubmitting(false);

    if (!result.ok || !result.customer) {
      setError(result.message ?? "Invalid OTP");
      return;
    }

    setCustomer(result.customer);
    await refresh();
    navigate("/account", { replace: true });
  };

  return (
    <SiteShell>
      <PageHero
        eyebrow="My Account"
        title="Customer Login"
        subtitle="Sign in with your mobile number to track orders, manage your profile, and reorder faster."
      />

      <div className="mx-auto max-w-md px-4 py-12">
        <ContentCard>
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-primary/5 border border-primary/15 px-4 py-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display font-bold text-foreground">Secure OTP Login</div>
              <div className="text-xs text-muted-foreground">We send a 6-digit code to your mobile</div>
            </div>
          </div>

          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label htmlFor="login-phone" className="block text-sm font-semibold mb-2">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="login-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full rounded-full border-2 border-primary/25 bg-card pl-11 pr-4 py-3 text-sm outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" disabled={submitting} className="w-full rounded-full milk-btn-primary">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending OTP…
                  </>
                ) : (
                  "Send OTP"
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                OTP sent to <span className="font-semibold text-foreground">+91 {phone}</span>
              </p>

              {debugOtp && (
                <p className="text-xs rounded-xl bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2">
                  Dev mode OTP: <strong>{debugOtp}</strong>
                </p>
              )}

              <div>
                <label htmlFor="login-otp" className="block text-sm font-semibold mb-2">
                  Enter OTP
                </label>
                <input
                  id="login-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit code"
                  className="w-full rounded-full border-2 border-primary/25 bg-card px-4 py-3 text-center text-lg tracking-[0.35em] font-semibold outline-none focus:border-primary transition-colors"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" disabled={submitting} className="w-full rounded-full milk-btn-primary">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying…
                  </>
                ) : (
                  "Verify & Login"
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                  setError(null);
                }}
                className="w-full text-sm text-primary hover:underline"
              >
                Change mobile number
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            New customer? Login creates your account automatically.
          </p>
          <p className="mt-2 text-center text-xs">
            <Link to="/track-order" className="text-primary hover:underline">
              Track order without login
            </Link>
          </p>
        </ContentCard>
      </div>
    </SiteShell>
  );
}
