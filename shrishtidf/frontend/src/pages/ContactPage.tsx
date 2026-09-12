import { useState } from "react";
import { Loader2, Mail, MapPin, Phone } from "lucide-react";

import { ContentCard } from "@/components/layout/ContentCard";
import { PageHero } from "@/components/layout/PageHero";
import { SiteShell } from "@/components/layout/SiteShell";
import { submitLead } from "@/lib/api/content";
import { CONTACT } from "@/lib/site-data";

export function ContactPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await submitLead({
      name: name.trim(),
      phone: phone.trim(),
      message: message.trim(),
      source: "contact_form",
    });

    setSubmitting(false);

    if (result.ok) {
      setDone(true);
      setName("");
      setPhone("");
      setMessage("");
      return;
    }

    setError(result.message ?? "Unable to send message. Please call us.");
  };

  return (
    <SiteShell>
      <PageHero
        eyebrow="Get in Touch"
        title="Contact Us"
        subtitle="Call us for orders, subscriptions, or delivery enquiries. We are happy to help."
      />
      <div className="mx-auto max-w-4xl px-4 py-12 grid md:grid-cols-2 gap-6">
        <ContentCard>
          <h2 className="font-display text-xl font-bold mb-6">Reach Us</h2>
          <ul className="space-y-5 text-sm">
            <li className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground">Phone</div>
                <a href={`tel:+91${CONTACT.phones[0]}`} className="text-primary hover:underline">
                  +91 {CONTACT.phones[0]}
                </a>
                <br />
                <a href={`tel:+91${CONTACT.phones[1]}`} className="text-primary hover:underline">
                  +91 {CONTACT.phones[1]}
                </a>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground">Email</div>
                <span className="text-muted-foreground">orders@shrishtidairyfarm.com</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground">Address</div>
                <span className="text-muted-foreground">{CONTACT.address}</span>
              </div>
            </li>
          </ul>
        </ContentCard>
        <ContentCard>
          <h2 className="font-display text-xl font-bold mb-4">Send a Message</h2>
          {done ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Thank you! We received your message and will contact you shortly.
              </p>
              <button
                type="button"
                onClick={() => setDone(false)}
                className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help?"
                rows={4}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary resize-none"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-semibold hover:bg-primary/90 disabled:opacity-70 inline-flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send Message"
                )}
              </button>
            </form>
          )}
        </ContentCard>
      </div>
    </SiteShell>
  );
}
