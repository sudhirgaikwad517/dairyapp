import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { submitLead } from "@/lib/api/content";

type FreeSampleModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FreeSampleModal({ open, onOpenChange }: FreeSampleModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const reset = () => {
    setName("");
    setPhone("");
    setError(null);
    setDone(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await submitLead({
      name: name.trim(),
      phone: phone.trim(),
      source: "free_sample",
    });

    setSubmitting(false);

    if (result.ok) {
      setDone(true);
      return;
    }

    setError(result.message ?? "Unable to submit. Please call us directly.");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Request a Free Sample</DialogTitle>
          <DialogDescription>
            Share your name and mobile number. Our team will call you to arrange your free sample.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="py-4 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Thank you! We have received your request and will contact you shortly.
            </p>
            <Button type="button" className="rounded-full" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="free-sample-name" className="text-sm font-medium text-foreground">
                Your name
              </label>
              <input
                id="free-sample-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label htmlFor="free-sample-phone" className="text-sm font-medium text-foreground">
                Mobile number
              </label>
              <input
                id="free-sample-phone"
                type="tel"
                required
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="10-digit mobile number"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting} className="w-full rounded-full">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
