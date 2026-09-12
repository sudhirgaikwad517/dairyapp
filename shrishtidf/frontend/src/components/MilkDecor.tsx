/** Decorative milk-themed background elements (pure CSS, no images). */
export function MilkBubbles({ className = "" }: { className?: string }) {
  return (
    <div className={`milk-bubbles pointer-events-none ${className}`} aria-hidden="true">
      <span className="milk-bubble milk-bubble-1" />
      <span className="milk-bubble milk-bubble-2" />
      <span className="milk-bubble milk-bubble-3" />
      <span className="milk-bubble milk-bubble-4" />
      <span className="milk-bubble milk-bubble-5" />
    </div>
  );
}

export function MilkWaveDivider({ compact = false }: { compact?: boolean }) {
  return (
    <div className="milk-wave-divider" aria-hidden="true">
      <svg viewBox="0 0 1440 48" preserveAspectRatio="none" className={`w-full ${compact ? "h-4 sm:h-8" : "h-8 sm:h-12"}`}>
        <path
          d="M0,24 C240,48 480,0 720,24 C960,48 1200,0 1440,24 L1440,48 L0,48 Z"
          fill="var(--milk-cream)"
        />
      </svg>
    </div>
  );
}

export function MilkDroplet({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`milk-droplet ${className}`}
      viewBox="0 0 24 32"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0C12 0 2 14 2 22a10 10 0 0 0 20 0c0-8-10-22-10-22z" />
    </svg>
  );
}
