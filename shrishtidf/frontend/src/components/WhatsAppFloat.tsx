import { MessageCircle } from "lucide-react";

type WhatsAppFloatProps = {
  phone?: string;
};

export function WhatsAppFloat({ phone = "7721881777" }: WhatsAppFloatProps) {
  const digits = phone.replace(/\D/g, "");
  const href = `https://wa.me/91${digits}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-float"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="h-7 w-7" fill="currentColor" strokeWidth={1.5} />
    </a>
  );
}
